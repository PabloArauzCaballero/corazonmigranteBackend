import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ContentPublication, HomepageFeaturedItem, HomepageSection } from '@/database/models';
import { AdvertisingModule } from '../advertising/advertising.module';
import { AuditModule } from '../audit/audit.module';
import { AdminHomepageController, PublicHomepageController } from './homepage.controller';
import { HomepageService } from './homepage.service';

@Module({
  imports: [
    SequelizeModule.forFeature([ContentPublication, HomepageSection, HomepageFeaturedItem]),
    AdvertisingModule,
    AuditModule,
  ],
  controllers: [PublicHomepageController, AdminHomepageController],
  providers: [HomepageService],
})
export class HomepageModule {}
