import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Includeable } from 'sequelize';
import {
  AdsCampaign,
  AdsCampaignCreative,
  AdsCampaignPlacement,
  AdsCompany,
  AdsPlacement,
} from '@/database/models';
import { buildPagination, toLimitOffset } from '@/common/pagination/pagination.dto';
import { AuditService } from '../audit/audit.service';
import { AdvertisingQueryDto } from './dto/advertising-query.dto';
import {
  CreateAdsCampaignDto,
  SetAdsCampaignStatusDto,
  UpdateAdsCampaignDto,
} from './dto/campaign.dto';
import { toAdsCampaignDto } from './mappers/advertising.mapper';
import { assertCampaignDates } from './policies/campaign-date.policy';

@Injectable()
export class AdvertisingCampaignsService {
  private readonly include: Includeable[] = [
    { model: AdsCompany },
    { model: AdsCampaignCreative },
    { model: AdsPlacement, through: { attributes: [] } },
  ];

  constructor(
    @InjectModel(AdsCampaign) private readonly campaignModel: typeof AdsCampaign,
    @InjectModel(AdsCampaignPlacement)
    private readonly campaignPlacementModel: typeof AdsCampaignPlacement,
    @InjectModel(AdsCompany) private readonly companyModel: typeof AdsCompany,
    @InjectModel(AdsPlacement) private readonly placementModel: typeof AdsPlacement,
    private readonly audit: AuditService,
  ) {}

  async list(query: AdvertisingQueryDto) {
    const { rows, count } = await this.campaignModel.findAndCountAll({
      ...toLimitOffset(query),
      distinct: true,
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.companyId ? { companyId: query.companyId } : {}),
      },
      include: this.include,
      order: [[query.sort, query.order]],
    });
    return { items: rows.map(toAdsCampaignDto), pagination: buildPagination(query, count) };
  }

  async get(id: string) {
    return toAdsCampaignDto(await this.find(id));
  }

  async create(actorUserId: string, dto: CreateAdsCampaignDto) {
    assertCampaignDates(dto.startsAt, dto.endsAt);
    await this.assertCompany(dto.companyId);
    await this.assertPlacements(dto.placementIds);
    return this.campaignModel.sequelize!.transaction(async (transaction) => {
      const campaign = await this.campaignModel.create(
        {
          ...dto,
          startsAt: new Date(dto.startsAt),
          endsAt: new Date(dto.endsAt),
          status: 'DRAFT',
          objective: dto.objective ?? 'AWARENESS',
          budgetAmount: dto.budgetAmount ?? 0,
          currency: dto.currency ?? 'BOB',
          priority: dto.priority ?? 100,
          pacing: 'STANDARD',
          createdByUserId: actorUserId,
        } as any,
        { transaction },
      );
      await this.replacePlacements(campaign.id, dto.placementIds ?? [], transaction);
      await this.auditCampaign(actorUserId, 'create', campaign, undefined, transaction);
      return this.get(campaign.id);
    });
  }

  async update(actorUserId: string, id: string, dto: UpdateAdsCampaignDto) {
    const campaign = await this.find(id);
    const startsAt = dto.startsAt ?? campaign.startsAt;
    const endsAt = dto.endsAt ?? campaign.endsAt;
    assertCampaignDates(startsAt, endsAt);
    if (dto.companyId) await this.assertCompany(dto.companyId);
    await this.assertPlacements(dto.placementIds);
    const before = campaign.toJSON();
    return campaign.sequelize!.transaction(async (transaction) => {
      await campaign.update(
        {
          ...dto,
          startsAt: dto.startsAt ? new Date(dto.startsAt) : campaign.startsAt,
          endsAt: dto.endsAt ? new Date(dto.endsAt) : campaign.endsAt,
        } as any,
        { transaction },
      );
      if (dto.placementIds)
        await this.replacePlacements(campaign.id, dto.placementIds, transaction);
      await this.auditCampaign(actorUserId, 'update', campaign, before, transaction);
      return this.get(campaign.id);
    });
  }

  async setStatus(actorUserId: string, id: string, dto: SetAdsCampaignStatusDto) {
    const campaign = await this.find(id);
    const before = campaign.toJSON();
    return campaign.sequelize!.transaction(async (transaction) => {
      await campaign.update({ status: dto.status } as any, { transaction });
      await this.auditCampaign(actorUserId, 'status', campaign, before, transaction);
      return this.get(campaign.id);
    });
  }

  async find(id: string) {
    const campaign = await this.campaignModel.findByPk(id, { include: this.include });
    if (!campaign) {
      throw new NotFoundException({
        code: 'ADS_CAMPAIGN_NOT_FOUND',
        message: 'Campaña no encontrada.',
      });
    }
    return campaign;
  }

  private async assertCompany(companyId: string) {
    if (!(await this.companyModel.findByPk(companyId))) {
      throw new NotFoundException({
        code: 'ADS_COMPANY_NOT_FOUND',
        message: 'Empresa anunciante no encontrada.',
      });
    }
  }

  private async assertPlacements(placementIds?: string[]) {
    if (!placementIds?.length) return;
    const count = await this.placementModel.count({ where: { id: placementIds } });
    if (count !== new Set(placementIds).size) {
      throw new NotFoundException({
        code: 'ADS_PLACEMENT_NOT_FOUND',
        message: 'Uno o más placements no existen.',
      });
    }
  }

  private async replacePlacements(campaignId: string, placementIds: string[], transaction: any) {
    await this.campaignPlacementModel.destroy({ where: { campaignId }, transaction });
    if (!placementIds.length) return;
    const rows = [...new Set(placementIds)].map((placementId) => ({ campaignId, placementId }));
    await this.campaignPlacementModel.bulkCreate(rows as any[], { transaction });
  }

  private async auditCampaign(
    actorUserId: string,
    action: string,
    campaign: AdsCampaign,
    before?: unknown,
    transaction?: any,
  ) {
    await this.audit.log(
      {
        actorUserId,
        action: `advertising.campaign.${action}`,
        entityType: 'AdsCampaign',
        entityId: campaign.id,
        before,
        after: campaign.toJSON(),
      },
      { transaction },
    );
  }
}
