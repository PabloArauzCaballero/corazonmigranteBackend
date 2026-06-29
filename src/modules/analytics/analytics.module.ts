import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { PublicVisit, UiEvent } from '@/database/models';
import { AnalyticsController, AdminAnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
@Module({
  imports: [SequelizeModule.forFeature([PublicVisit, UiEvent])],
  controllers: [AnalyticsController, AdminAnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
