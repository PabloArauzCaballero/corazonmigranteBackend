import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import {
  AdsCampaign,
  AdsCampaignCreative,
  AdsCampaignPlacement,
  AdsCompany,
  AdsPlacement,
} from '@/database/models';
import { AuditModule } from '../audit/audit.module';
import { AdminAdvertisingController } from './admin-advertising.controller';
import { PublicAdvertisingController } from './public-advertising.controller';
import { AdvertisingCampaignsService } from './advertising-campaigns.service';
import { AdvertisingCompaniesService } from './advertising-companies.service';
import { AdvertisingCreativesService } from './advertising-creatives.service';
import { AdvertisingPlacementsService } from './advertising-placements.service';
import { AdvertisingPublicService } from './advertising-public.service';

@Module({
  imports: [
    SequelizeModule.forFeature([
      AdsCampaign,
      AdsCampaignCreative,
      AdsCampaignPlacement,
      AdsCompany,
      AdsPlacement,
    ]),
    AuditModule,
  ],
  controllers: [PublicAdvertisingController, AdminAdvertisingController],
  providers: [
    AdvertisingCampaignsService,
    AdvertisingCompaniesService,
    AdvertisingCreativesService,
    AdvertisingPlacementsService,
    AdvertisingPublicService,
  ],
  exports: [AdvertisingPublicService],
})
export class AdvertisingModule {}
