import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import {
  ContentAuthor,
  ContentCategory,
  ContentPublication,
  ContentTag,
  HomepageFeaturedItem,
  HomepageSection,
} from '@/database/models';
import { AuthenticatedUser } from '@/common/types/authenticated-user';
import { AdvertisingPublicService } from '../advertising/advertising-public.service';
import { AuditService } from '../audit/audit.service';
import { toPublicationCard } from '../content/mappers/content.mapper';
import { HomepageQueryDto, UpdateHomepageLayoutDto } from './dto/homepage.dto';

@Injectable()
export class HomepageService {
  constructor(
    @InjectModel(ContentPublication) private readonly publicationModel: typeof ContentPublication,
    @InjectModel(HomepageSection) private readonly sectionModel: typeof HomepageSection,
    @InjectModel(HomepageFeaturedItem)
    private readonly featuredItemModel: typeof HomepageFeaturedItem,
    private readonly advertising: AdvertisingPublicService,
    private readonly audit: AuditService,
  ) {}

  async getHomepage(query: HomepageQueryDto, user?: AuthenticatedUser) {
    const [headlines, columns, advertising, layout] = await Promise.all([
      this.latestPublications(query.headlineLimit ?? 6, ['NEWS', 'REPORT', 'ANALYSIS']),
      this.latestPublications(query.columnLimit ?? 4, ['COLUMN', 'OPINION']),
      this.advertising.getSlots({ placementCode: 'home_hero' }),
      this.getLayout(),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      viewer: { authenticated: Boolean(user), adsPersonalized: false },
      editorial: {
        topHeadline: headlines[0] ?? null,
        headlines,
        columns,
      },
      advertising,
      layout,
    };
  }

  async getAdminPreview(query: HomepageQueryDto, user?: AuthenticatedUser) {
    const payload = await this.getHomepage(query, user);
    return {
      ...payload,
      adminPreview: true,
      qualityPolicy: {
        noHardcodedContent: true,
        contentComesFromContentPublications: true,
        advertisingRequiresActiveCompanyCampaignAndCreative: true,
      },
    };
  }

  async updateLayout(actorUserId: string, dto: UpdateHomepageLayoutDto) {
    return this.sectionModel.sequelize!.transaction(async (transaction) => {
      await this.featuredItemModel.destroy({ where: {}, transaction, force: true });
      await this.sectionModel.destroy({ where: {}, transaction, force: true });

      for (const sectionDto of dto.sections) {
        const section = await this.sectionModel.create(
          {
            code: sectionDto.code,
            title: sectionDto.title,
            type: sectionDto.type,
            sortOrder: sectionDto.sortOrder ?? 0,
            isActive: sectionDto.isActive ?? true,
            metadata: sectionDto.metadata ?? {},
          } as any,
          { transaction },
        );
        const items = (sectionDto.items ?? []).map((item) => ({
          sectionId: section.id,
          itemType: item.itemType,
          itemId: item.itemId,
          sortOrder: item.sortOrder ?? 0,
          status: 'ACTIVE',
          metadata: item.metadata ?? {},
        }));
        if (items.length) await this.featuredItemModel.bulkCreate(items as any[], { transaction });
      }

      await this.audit.log(
        {
          actorUserId,
          action: 'homepage.layout.update',
          entityType: 'HomepageLayout',
          after: dto,
        },
        { transaction },
      );
      return this.getLayout();
    });
  }

  private async latestPublications(limit: number, publicationTypes: string[]) {
    const rows = await this.publicationModel.findAll({
      where: {
        status: 'PUBLISHED',
        accessType: { [Op.in]: ['PUBLIC', 'PREMIUM'] } as any,
        publicationType: { [Op.in]: publicationTypes } as any,
      },
      include: [
        { model: ContentAuthor, where: { status: 'ACTIVE' }, required: true },
        { model: ContentCategory, where: { isActive: true }, required: true },
        { model: ContentTag, through: { attributes: [] } },
      ],
      order: [['publishedAt', 'DESC']],
      limit,
    });
    return rows.map(toPublicationCard);
  }

  private async getLayout() {
    const sections = await this.sectionModel.findAll({
      where: { isActive: true },
      include: [{ model: HomepageFeaturedItem, where: { status: 'ACTIVE' }, required: false }],
      order: [
        ['sortOrder', 'ASC'],
        [{ model: HomepageFeaturedItem, as: 'items' }, 'sortOrder', 'ASC'],
      ],
    });
    return sections.map((section) => ({
      id: section.id,
      code: section.code,
      title: section.title,
      type: section.type,
      sortOrder: section.sortOrder,
      metadata: section.metadata,
      items:
        section.items?.map((item) => ({
          id: item.id,
          itemType: item.itemType,
          itemId: item.itemId,
          sortOrder: item.sortOrder,
          metadata: item.metadata,
        })) ?? [],
    }));
  }
}
