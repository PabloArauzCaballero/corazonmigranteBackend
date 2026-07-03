import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { ContentAuthor } from '@/database/models';
import { AuditService } from '../audit/audit.service';
import { CreateContentAuthorDto, UpdateContentAuthorDto } from './dto/author.dto';
import { toAuthorDto } from './mappers/content.mapper';

@Injectable()
export class ContentAuthorsService {
  constructor(
    @InjectModel(ContentAuthor) private readonly authorModel: typeof ContentAuthor,
    private readonly audit: AuditService,
  ) {}

  async list() {
    const authors = await this.authorModel.findAll({ order: [['displayName', 'ASC']] });
    return authors.map(toAuthorDto);
  }

  async create(actorUserId: string, dto: CreateContentAuthorDto) {
    return this.authorModel.sequelize!.transaction(async (transaction) => {
      const author = await this.authorModel.create(
        { ...dto, status: dto.status ?? 'ACTIVE' } as any,
        {
          transaction,
        },
      );
      await this.audit.log(
        {
          actorUserId,
          action: 'content.author.create',
          entityType: 'ContentAuthor',
          entityId: author.id,
          after: author.toJSON(),
        },
        { transaction },
      );
      return toAuthorDto(author);
    });
  }

  async update(actorUserId: string, id: string, dto: UpdateContentAuthorDto) {
    const author = await this.find(id);
    const before = author.toJSON();
    return author.sequelize!.transaction(async (transaction) => {
      await author.update(dto as any, { transaction });
      await this.audit.log(
        {
          actorUserId,
          action: 'content.author.update',
          entityType: 'ContentAuthor',
          entityId: author.id,
          before,
          after: author.toJSON(),
        },
        { transaction },
      );
      return toAuthorDto(author);
    });
  }

  async find(id: string) {
    const author = await this.authorModel.findByPk(id);
    if (!author) {
      throw new NotFoundException({
        code: 'CONTENT_AUTHOR_NOT_FOUND',
        message: 'Autor no encontrado.',
      });
    }
    return author;
  }
}
