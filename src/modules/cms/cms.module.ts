import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { CmsElement, CmsPage } from '@/database/models';
import { AuditModule } from '../audit/audit.module';
import { CmsController, AdminCmsController } from './cms.controller';
import { CmsService } from './cms.service';
@Module({
  imports: [SequelizeModule.forFeature([CmsPage, CmsElement]), AuditModule],
  controllers: [CmsController, AdminCmsController],
  providers: [CmsService],
})
export class CmsModule {}
