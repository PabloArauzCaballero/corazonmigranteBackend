import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { TherapyApproach, TherapyProduct } from '@/database/models';
import { AuditModule } from '../audit/audit.module';
import {
  TherapyCatalogController,
  AdminTherapyCatalogController,
} from './therapy-catalog.controller';
import { TherapyCatalogService } from './therapy-catalog.service';

@Module({
  imports: [SequelizeModule.forFeature([TherapyApproach, TherapyProduct]), AuditModule],
  controllers: [TherapyCatalogController, AdminTherapyCatalogController],
  providers: [TherapyCatalogService],
  exports: [TherapyCatalogService],
})
export class TherapyCatalogModule {}
