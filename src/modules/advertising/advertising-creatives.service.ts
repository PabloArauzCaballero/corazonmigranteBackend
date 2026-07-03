import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { AdsCampaign, AdsCampaignCreative } from '@/database/models';
import { AuditService } from '../audit/audit.service';
import { CreateAdsCreativeDto, UpdateAdsCreativeDto } from './dto/creative.dto';
import { toAdsCreativeDto } from './mappers/advertising.mapper';

@Injectable()
export class AdvertisingCreativesService {
  constructor(
    @InjectModel(AdsCampaignCreative) private readonly creativeModel: typeof AdsCampaignCreative,
    @InjectModel(AdsCampaign) private readonly campaignModel: typeof AdsCampaign,
    private readonly audit: AuditService,
  ) {}

  async list(campaignId: string) {
    await this.assertCampaign(campaignId);
    const creatives = await this.creativeModel.findAll({
      where: { campaignId },
      order: [
        ['isPrimary', 'DESC'],
        ['createdAt', 'DESC'],
      ],
    });
    return creatives.map(toAdsCreativeDto);
  }

  async create(actorUserId: string, campaignId: string, dto: CreateAdsCreativeDto) {
    await this.assertCampaign(campaignId);
    return this.creativeModel.sequelize!.transaction(async (transaction) => {
      const creative = await this.creativeModel.create(
        {
          ...dto,
          campaignId,
          mediaType: dto.mediaType ?? 'IMAGE',
          approvalStatus: 'APPROVED',
          sizeBytes: dto.sizeBytes ?? 0,
          isPrimary: dto.isPrimary ?? false,
        } as any,
        { transaction },
      );
      await this.audit.log(
        {
          actorUserId,
          action: 'advertising.creative.create',
          entityType: 'AdsCampaignCreative',
          entityId: creative.id,
          after: creative.toJSON(),
        },
        { transaction },
      );
      return toAdsCreativeDto(creative);
    });
  }

  async update(actorUserId: string, id: string, dto: UpdateAdsCreativeDto) {
    const creative = await this.find(id);
    const before = creative.toJSON();
    return creative.sequelize!.transaction(async (transaction) => {
      await creative.update(dto as any, { transaction });
      await this.audit.log(
        {
          actorUserId,
          action: 'advertising.creative.update',
          entityType: 'AdsCampaignCreative',
          entityId: creative.id,
          before,
          after: creative.toJSON(),
        },
        { transaction },
      );
      return toAdsCreativeDto(creative);
    });
  }

  private async find(id: string) {
    const creative = await this.creativeModel.findByPk(id);
    if (!creative) {
      throw new NotFoundException({
        code: 'ADS_CREATIVE_NOT_FOUND',
        message: 'Creativo no encontrado.',
      });
    }
    return creative;
  }

  private async assertCampaign(campaignId: string) {
    if (!(await this.campaignModel.findByPk(campaignId))) {
      throw new NotFoundException({
        code: 'ADS_CAMPAIGN_NOT_FOUND',
        message: 'Campaña no encontrada.',
      });
    }
  }
}
