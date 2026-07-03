import { BadRequestException } from '@nestjs/common';
import { assertCampaignDates, isCampaignDeliverable } from './campaign-date.policy';

describe('advertising campaign date policy', () => {
  it('rejects campaigns where the end date is not after start date', () => {
    expect(() => assertCampaignDates('2026-07-10T00:00:00Z', '2026-07-09T00:00:00Z')).toThrow(
      BadRequestException,
    );
  });

  it('accepts valid date windows', () => {
    expect(() => assertCampaignDates('2026-07-09T00:00:00Z', '2026-07-10T00:00:00Z')).not.toThrow();
  });

  it('marks only active campaigns with active company and current window as deliverable', () => {
    expect(
      isCampaignDeliverable({
        status: 'ACTIVE',
        companyStatus: 'ACTIVE',
        startsAt: new Date(Date.now() - 1000),
        endsAt: new Date(Date.now() + 1000),
      }),
    ).toBe(true);
  });
});
