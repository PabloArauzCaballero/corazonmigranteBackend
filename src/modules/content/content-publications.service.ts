import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Includeable } from 'sequelize';
import { ContentAuthor, ContentCategory, ContentPublication, ContentTag } from '@/database/models';
import { buildPagination, toLimitOffset } from '@/common/pagination/pagination.dto';
import { toSlug } from '@/common/utils/slug.util';
import { ContentPublicationAuditService } from './content-publication-audit.service';
import { ContentPublicationRelationsService } from './content-publication-relations.service';
import { ContentPublicationQueryDto, PublicContentQueryDto } from './dto/content-query.dto';
import {
  CreateContentPublicationDto,
  SchedulePublicationDto,
  UpdateContentPublicationDto,
} from './dto/publication.dto';
import { toPublicationCard, toPublicationDetail } from './mappers/content.mapper';
import { assertPublishable, assertScheduledAtInFuture } from './policies/publication-status.policy';
import { buildAdminPublicationWhere, buildPublicPublicationWhere } from './content-query.factory';

@Injectable()
export class ContentPublicationsService {
  private readonly baseInclude: Includeable[] = [
    { model: ContentAuthor },
    { model: ContentCategory },
    { model: ContentTag, through: { attributes: [] } },
  ];

  constructor(
    @InjectModel(ContentPublication) private readonly publicationModel: typeof ContentPublication,
    private readonly relations: ContentPublicationRelationsService,
    private readonly audit: ContentPublicationAuditService,
  ) {}

  async listAdmin(query: ContentPublicationQueryDto) {
    const { rows, count } = await this.publicationModel.findAndCountAll({
      ...toLimitOffset(query),
      distinct: true,
      where: buildAdminPublicationWhere(query),
      include: this.baseInclude,
      order: [[query.sort, query.order]],
    });
    return { items: rows.map(toPublicationCard), pagination: buildPagination(query, count) };
  }

  async listPublic(query: PublicContentQueryDto, publicationType?: string) {
    const { rows, count } = await this.publicationModel.findAndCountAll({
      ...toLimitOffset(query),
      distinct: true,
      where: buildPublicPublicationWhere(query, publicationType),
      include: this.publicFilters(query),
      order: [['publishedAt', 'DESC']],
    });
    return { items: rows.map(toPublicationCard), pagination: buildPagination(query, count) };
  }

  async getPublicBySlug(slug: string) {
    const publication = await this.publicationModel.findOne({
      where: { slug, status: 'PUBLISHED' },
      include: this.baseInclude,
    });
    if (!publication || publication.accessType === 'INTERNAL_ONLY') {
      throw new NotFoundException({
        code: 'CONTENT_PUBLICATION_NOT_FOUND',
        message: 'Publicación no encontrada.',
      });
    }
    return toPublicationDetail(publication, publication.accessType !== 'PREMIUM');
  }

  async getAdmin(id: string) {
    const publication = await this.find(id);
    return toPublicationDetail(publication);
  }

  async create(actorUserId: string, dto: CreateContentPublicationDto) {
    await this.relations.assertReferences(dto.authorId, dto.categoryId, dto.tagIds);
    return this.publicationModel.sequelize!.transaction(async (transaction) => {
      const publication = await this.publicationModel.create(
        {
          ...dto,
          slug: dto.slug ?? toSlug(dto.title),
          publicationType: dto.publicationType ?? 'NEWS',
          accessType: dto.accessType ?? 'PUBLIC',
          status: dto.scheduledAt ? 'SCHEDULED' : 'DRAFT',
          scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
          commentsEnabled: dto.commentsEnabled ?? true,
          reactionsEnabled: dto.reactionsEnabled ?? true,
          seoMetadata: dto.seoMetadata ?? {},
        } as any,
        { transaction },
      );
      await this.relations.replaceTags(publication.id, dto.tagIds ?? [], transaction);
      await this.audit.log(actorUserId, 'create', publication, undefined, transaction);
      return this.getAdmin(publication.id);
    });
  }

  async update(actorUserId: string, id: string, dto: UpdateContentPublicationDto) {
    const publication = await this.find(id);
    await this.relations.assertReferences(dto.authorId, dto.categoryId, dto.tagIds);
    const before = publication.toJSON();
    return publication.sequelize!.transaction(async (transaction) => {
      await publication.update(
        {
          ...dto,
          scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : publication.scheduledAt,
        } as any,
        { transaction },
      );
      if (dto.tagIds) await this.relations.replaceTags(publication.id, dto.tagIds, transaction);
      await this.audit.log(actorUserId, 'update', publication, before, transaction);
      return this.getAdmin(publication.id);
    });
  }

  async publish(actorUserId: string, id: string) {
    const publication = await this.find(id);
    assertPublishable(publication);
    const before = publication.toJSON();
    return publication.sequelize!.transaction(async (transaction) => {
      await publication.update({ status: 'PUBLISHED', publishedAt: new Date() } as any, {
        transaction,
      });
      await this.audit.log(actorUserId, 'publish', publication, before, transaction);
      return this.getAdmin(publication.id);
    });
  }

  async schedule(actorUserId: string, id: string, dto: SchedulePublicationDto) {
    assertScheduledAtInFuture(dto.scheduledAt);
    const publication = await this.find(id);
    const before = publication.toJSON();
    return publication.sequelize!.transaction(async (transaction) => {
      await publication.update(
        { status: 'SCHEDULED', scheduledAt: new Date(dto.scheduledAt) } as any,
        {
          transaction,
        },
      );
      await this.audit.log(actorUserId, 'schedule', publication, before, transaction);
      return this.getAdmin(publication.id);
    });
  }

  async archive(actorUserId: string, id: string) {
    const publication = await this.find(id);
    const before = publication.toJSON();
    return publication.sequelize!.transaction(async (transaction) => {
      await publication.update({ status: 'ARCHIVED' } as any, { transaction });
      await this.audit.log(actorUserId, 'archive', publication, before, transaction);
      return toPublicationCard(publication);
    });
  }

  private async find(id: string) {
    const publication = await this.publicationModel.findByPk(id, { include: this.baseInclude });
    if (!publication) {
      throw new NotFoundException({
        code: 'CONTENT_PUBLICATION_NOT_FOUND',
        message: 'Publicación no encontrada.',
      });
    }
    return publication;
  }

  private publicFilters(query: PublicContentQueryDto): Includeable[] {
    return [
      { model: ContentAuthor, where: { status: 'ACTIVE' }, required: true },
      {
        model: ContentCategory,
        where: { ...(query.categorySlug ? { slug: query.categorySlug } : {}), isActive: true },
        required: true,
      },
      {
        model: ContentTag,
        where: query.tagSlug ? { slug: query.tagSlug } : undefined,
        required: Boolean(query.tagSlug),
        through: { attributes: [] },
      },
    ];
  }
}
