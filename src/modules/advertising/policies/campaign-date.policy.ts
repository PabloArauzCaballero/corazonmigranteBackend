import { BadRequestException } from '@nestjs/common';

export function assertCampaignDates(startsAt: string | Date, endsAt: string | Date) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    throw new BadRequestException({
      code: 'ADS_INVALID_CAMPAIGN_DATES',
      message: 'La campaña debe tener fecha final posterior a la fecha inicial.',
    });
  }
}

export function isCampaignDeliverable(input: {
  status: string;
  startsAt: Date;
  endsAt: Date;
  companyStatus?: string;
}) {
  const now = Date.now();
  return (
    input.status === 'ACTIVE' &&
    input.companyStatus === 'ACTIVE' &&
    input.startsAt.getTime() <= now &&
    input.endsAt.getTime() > now
  );
}
