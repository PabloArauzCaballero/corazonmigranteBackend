import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import {
  ContentAuthor,
  ContentCategory,
  ContentPublication,
  ContentPublicationTag,
  ContentTag,
} from '@/database/models';
import { AuditModule } from '../audit/audit.module';
import { AdminContentController } from './admin-content.controller';
import { PublicContentController } from './public-content.controller';
import { ContentAuthorsService } from './content-authors.service';
import { ContentPublicationAuditService } from './content-publication-audit.service';
import { ContentPublicationRelationsService } from './content-publication-relations.service';
import { ContentPublicationsService } from './content-publications.service';
import { ContentTaxonomyService } from './content-taxonomy.service';

@Module({
  imports: [
    SequelizeModule.forFeature([
      ContentAuthor,
      ContentCategory,
      ContentPublication,
      ContentPublicationTag,
      ContentTag,
    ]),
    AuditModule,
  ],
  controllers: [PublicContentController, AdminContentController],
  providers: [
    ContentAuthorsService,
    ContentPublicationAuditService,
    ContentPublicationRelationsService,
    ContentPublicationsService,
    ContentTaxonomyService,
  ],
  exports: [ContentPublicationsService, ContentTaxonomyService],
})
export class ContentModule {}
