import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import { Storage } from '@google-cloud/storage';
import { createHash, randomUUID } from 'crypto';
import { createReadStream, existsSync, mkdirSync, readFileSync, renameSync, unlinkSync } from 'fs';
import { extname, join } from 'path';
import { Response } from 'express';
import { FileAccessLog, FileAsset } from '@/database/models';
import { AuthenticatedUser } from '@/common/types/authenticated-user';
import { AuditService } from '../audit/audit.service';
import { UploadFileDto } from './dto/file.dto';

const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
const STORAGE_PROVIDER_LOCAL = 'LOCAL';
const STORAGE_PROVIDER_GCS = 'GCS';

@Injectable()
export class FilesService {
  private readonly gcs?: Storage;

  constructor(
    @InjectModel(FileAsset) private readonly fileModel: typeof FileAsset,
    @InjectModel(FileAccessLog) private readonly accessLogModel: typeof FileAccessLog,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {
    if (this.storageProvider === STORAGE_PROVIDER_GCS) {
      const projectId = this.config.get<string>('files.gcs.projectId') || undefined;
      const credentials = this.config.get<Record<string, unknown>>('files.gcs.credentials') || undefined;
      this.gcs = new Storage({ ...(projectId ? { projectId } : {}), ...(credentials ? { credentials } : {}) });
    }
  }

  private get storageProvider() {
    return (
      this.config.get<string>('files.storageProvider') ?? STORAGE_PROVIDER_LOCAL
    ).toUpperCase();
  }

  private get gcsBucketName() {
    return this.config.get<string>('files.gcs.bucket');
  }

  async upload(user: AuthenticatedUser, dto: UploadFileDto, file?: Express.Multer.File) {
    if (!file)
      throw new BadRequestException({ code: 'FILE_REQUIRED', message: 'Archivo requerido.' });
    if (!ALLOWED_MIME.includes(file.mimetype))
      throw new BadRequestException({
        code: 'FILE_MIME_NOT_ALLOWED',
        message: 'Tipo de archivo no permitido.',
      });
    const maxBytes = (this.config.get<number>('files.maxUploadMb') ?? 8) * 1024 * 1024;
    if (file.size > maxBytes)
      throw new BadRequestException({
        code: 'FILE_TOO_LARGE',
        message: 'El archivo excede el tamaño máximo.',
      });

    const safeExt = extname(file.originalname).toLowerCase();
    const objectKey = this.buildObjectKey(dto.module, user.sub, safeExt);
    const checksum = createHash('sha256').update(readFileSync(file.path)).digest('hex');

    const storageProvider = this.storageProvider;
    const bucket = storageProvider === STORAGE_PROVIDER_GCS ? this.gcsBucketName : undefined;

    let externalObjectCreated = false;
    try {
      if (storageProvider === STORAGE_PROVIDER_GCS) {
        await this.uploadToGcs(file, objectKey);
      } else {
        this.moveToLocalStorage(file, objectKey, dto.module, user.sub);
      }
      externalObjectCreated = true;

      return await this.fileModel.sequelize!.transaction(async (transaction) => {
        const record = await this.fileModel.create(
          {
            ownerUserId: user.sub,
            module: dto.module,
            entityType: dto.entityType,
            entityId: dto.entityId,
            storageProvider,
            bucket,
            objectKey,
            originalName: file.originalname,
            mimeType: file.mimetype,
            sizeBytes: file.size,
            checksum,
            visibility: dto.visibility ?? 'PRIVATE',
            status: 'ACTIVE',
            metadata: {},
          } as any,
          { transaction },
        );

        await this.audit.log(
          {
            actorUserId: user.sub,
            action: 'files.upload',
            entityType: 'FileAsset',
            entityId: record.id,
            after: { module: dto.module, visibility: record.visibility, storageProvider },
          },
          { transaction },
        );

        return record;
      });
    } catch (error) {
      if (externalObjectCreated) {
        await this.deleteExternalObject(storageProvider, bucket, objectKey);
      }
      if (existsSync(file.path)) {
        unlinkSync(file.path);
      }
      throw error;
    }
  }

  async getDownloadInfo(user: AuthenticatedUser | undefined, id: string) {
    const file = await this.findAllowedFile(user, id);
    await this.accessLogModel.create({
      fileId: file.id,
      actorUserId: user?.sub,
      action: 'SIGNED_URL',
    } as any);

    if (file.storageProvider === STORAGE_PROVIDER_GCS) {
      return this.getGcsSignedUrl(file);
    }

    return {
      fileId: file.id,
      provider: STORAGE_PROVIDER_LOCAL,
      url: `${this.config.get<string>('files.publicBaseUrl')}/api/v1/files/${file.id}/download`,
      expiresInSeconds: this.config.get<number>('files.signedUrlExpiresSeconds') ?? 900,
    };
  }

  async downloadLocal(user: AuthenticatedUser | undefined, id: string, response: Response) {
    const file = await this.findAllowedFile(user, id);
    if (file.storageProvider !== STORAGE_PROVIDER_LOCAL) {
      const signed = await this.getGcsSignedUrl(file);
      response.redirect(signed.url);
      return undefined;
    }

    const uploadDir = this.config.get<string>('files.uploadDir') ?? 'storage/uploads';
    const fullPath = join(uploadDir, file.objectKey);
    if (!existsSync(fullPath))
      throw new NotFoundException({
        code: 'FILE_OBJECT_NOT_FOUND',
        message: 'El archivo físico no existe en almacenamiento local.',
      });

    await this.accessLogModel.create({
      fileId: file.id,
      actorUserId: user?.sub,
      action: 'DOWNLOAD',
    } as any);
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(file.originalName)}"`,
    );
    return new StreamableFile(createReadStream(fullPath));
  }

  private async findAllowedFile(user: AuthenticatedUser | undefined, id: string) {
    const file = await this.fileModel.findByPk(id);
    if (!file)
      throw new NotFoundException({ code: 'FILE_NOT_FOUND', message: 'Archivo no encontrado.' });
    const isOwner = user?.sub === file.ownerUserId;
    const isAdmin = user?.roles?.some((role) => ['ADMIN', 'SUPER_ADMIN'].includes(role));
    if (file.visibility !== 'PUBLIC' && !isOwner && !isAdmin) {
      throw new ForbiddenException({
        code: 'FILE_FORBIDDEN',
        message: 'No puede acceder a este archivo.',
      });
    }
    return file;
  }


  private buildObjectKey(module: string, userId: string, safeExt: string) {
    const moduleKey = module.toLowerCase();
    const userMediaPrefix = this.config.get<string>('files.gcs.userMediaPrefix') ?? 'users';
    const publicAssetsPrefix = this.config.get<string>('files.gcs.publicAssetsPrefix') ?? 'public';
    const prefix = module === 'CMS' || module === 'THERAPY_CATALOG' ? publicAssetsPrefix : userMediaPrefix;
    return `${prefix}/${moduleKey}/${userId}/${randomUUID()}${safeExt}`;
  }

  private moveToLocalStorage(
    file: Express.Multer.File,
    objectKey: string,
    module: string,
    userId: string,
  ) {
    const uploadDir = this.config.get<string>('files.uploadDir') ?? 'storage/uploads';
    mkdirSync(uploadDir, { recursive: true });
    const finalPath = join(uploadDir, objectKey);
    mkdirSync(join(uploadDir, module.toLowerCase(), userId), { recursive: true });
    renameSync(file.path, finalPath);
  }

  private async deleteExternalObject(
    storageProvider: string,
    bucket: string | undefined,
    objectKey: string,
  ) {
    try {
      if (storageProvider === STORAGE_PROVIDER_GCS) {
        if (this.gcs && bucket) {
          await this.gcs.bucket(bucket).file(objectKey).delete({ ignoreNotFound: true });
        }
        return;
      }
      const uploadDir = this.config.get<string>('files.uploadDir') ?? 'storage/uploads';
      const fullPath = join(uploadDir, objectKey);
      if (existsSync(fullPath)) {
        unlinkSync(fullPath);
      }
    } catch {
      // La operación principal ya falló. No se oculta el error original por un fallo de limpieza.
    }
  }

  private async uploadToGcs(file: Express.Multer.File, objectKey: string) {
    if (!this.gcs)
      throw new BadRequestException({
        code: 'GCS_NOT_CONFIGURED',
        message: 'Google Cloud Storage no está inicializado.',
      });
    const bucketName = this.gcsBucketName;
    if (!bucketName)
      throw new BadRequestException({
        code: 'GCS_BUCKET_REQUIRED',
        message: 'Debe configurar GCS_BUCKET.',
      });

    await this.gcs.bucket(bucketName).upload(file.path, {
      destination: objectKey,
      resumable: false,
      metadata: {
        contentType: file.mimetype,
        metadata: {
          originalName: file.originalname,
        },
      },
    });
    unlinkSync(file.path);
  }

  private async getGcsSignedUrl(file: FileAsset) {
    if (!this.gcs)
      throw new BadRequestException({
        code: 'GCS_NOT_CONFIGURED',
        message: 'Google Cloud Storage no está inicializado.',
      });
    if (!file.bucket)
      throw new BadRequestException({
        code: 'GCS_BUCKET_MISSING_IN_FILE',
        message: 'El archivo no tiene bucket asociado.',
      });

    const expiresInSeconds = this.config.get<number>('files.signedUrlExpiresSeconds') ?? 900;
    const [url] = await this.gcs
      .bucket(file.bucket)
      .file(file.objectKey)
      .getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + expiresInSeconds * 1000,
        responseDisposition: `attachment; filename="${encodeURIComponent(file.originalName)}"`,
      });

    return {
      fileId: file.id,
      provider: STORAGE_PROVIDER_GCS,
      bucket: file.bucket,
      objectKey: file.objectKey,
      url,
      expiresInSeconds,
    };
  }
}
