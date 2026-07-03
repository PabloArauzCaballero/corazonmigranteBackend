import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { AdsCampaign, AdsCampaignCreative, AdsCompany, AdsPlacement } from '@/database/models';
import { PublicAdSlotsQueryDto } from './dto/advertising-query.dto';

@Injectable()
export class AdvertisingPublicService {
  constructor(@InjectModel(AdsCampaign) private readonly campaignModel: typeof AdsCampaign) {}

  async getSlots(query: PublicAdSlotsQueryDto) {
    const campaigns = await this.campaignModel.findAll({
      where: {
        status: 'ACTIVE',
        startsAt: { [Op.lte]: new Date() } as any,
        endsAt: { [Op.gt]: new Date() } as any,
      },
      include: [
        { model: AdsCompany, where: { status: 'ACTIVE' }, required: true },
        { model: AdsCampaignCreative, where: { approvalStatus: 'APPROVED' }, required: true },
        {
          model: AdsPlacement,
          where: {
            isActive: true,
            ...(query.placementCode ? { code: query.placementCode } : {}),
          },
          required: true,
          through: { attributes: [] },
        },
      ],
      order: [
        ['priority', 'ASC'],
        ['createdAt', 'DESC'],
      ],
      limit: 20,
    });

    return campaigns.flatMap((campaign) =>
      (campaign.creatives ?? []).map((creative) => ({
        campaignId: campaign.id,
        campaignName: campaign.name,
        company: campaign.company?.commercialName,
        creativeId: creative.id,
        title: creative.title,
        mediaType: creative.mediaType,
        assetUrl: creative.assetUrl,
        destinationUrl: creative.destinationUrl,
        altText: creative.altText,
        sponsorLabel: 'Contenido patrocinado',
        placements: campaign.placements?.map((placement) => placement.code) ?? [],
      })),
    );
  }
}
