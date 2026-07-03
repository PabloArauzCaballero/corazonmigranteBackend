import { AdsCampaign, AdsCampaignCreative, AdsCompany, AdsPlacement } from '@/database/models';

export function toAdsCompanyDto(company: AdsCompany) {
  return {
    id: company.id,
    businessName: company.businessName,
    commercialName: company.commercialName,
    taxId: company.taxId,
    contactName: company.contactName,
    contactEmail: company.contactEmail,
    contactPhone: company.contactPhone,
    status: company.status,
    metadata: company.metadata,
  };
}

export function toAdsPlacementDto(placement: AdsPlacement) {
  return {
    id: placement.id,
    code: placement.code,
    name: placement.name,
    description: placement.description,
    context: placement.context,
    isActive: placement.isActive,
    dimensions: placement.dimensions,
  };
}

export function toAdsCreativeDto(creative: AdsCampaignCreative) {
  return {
    id: creative.id,
    campaignId: creative.campaignId,
    fileId: creative.fileId,
    title: creative.title,
    mediaType: creative.mediaType,
    assetUrl: creative.assetUrl,
    destinationUrl: creative.destinationUrl,
    altText: creative.altText,
    mimeType: creative.mimeType,
    width: creative.width,
    height: creative.height,
    sizeBytes: creative.sizeBytes,
    approvalStatus: creative.approvalStatus,
    isPrimary: creative.isPrimary,
  };
}

export function toAdsCampaignDto(campaign: AdsCampaign) {
  return {
    id: campaign.id,
    companyId: campaign.companyId,
    company: campaign.company ? toAdsCompanyDto(campaign.company) : undefined,
    name: campaign.name,
    objective: campaign.objective,
    status: campaign.status,
    startsAt: campaign.startsAt,
    endsAt: campaign.endsAt,
    budgetAmount: Number(campaign.budgetAmount),
    currency: campaign.currency,
    priority: campaign.priority,
    pacing: campaign.pacing,
    notes: campaign.notes,
    creatives: campaign.creatives?.map(toAdsCreativeDto) ?? [],
    placements: campaign.placements?.map(toAdsPlacementDto) ?? [],
  };
}
