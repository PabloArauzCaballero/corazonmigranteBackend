import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CmsElement, CmsPage } from '@/database/models';
import { AuditService } from '../audit/audit.service';
import { CreateElementDto, CreatePageDto } from './dto/cms.dto';

@Injectable()
export class CmsService {
  constructor(
    @InjectModel(CmsPage) private readonly pageModel: typeof CmsPage,
    @InjectModel(CmsElement) private readonly elementModel: typeof CmsElement,
    private readonly audit: AuditService,
  ) {}

  /**
   * Endpoint publico: GET /public/pages/:slug
   *
   * Nota importante:
   * No usamos `include + order` aqui porque en sequelize-typescript puede romperse
   * si el alias generado para la relacion HasMany no coincide con el alias usado
   * al ordenar. Eso fue lo que generaba 500 en /public/pages/inicio.
   *
   * Se hace en dos consultas simples y estables:
   * 1. buscar pagina publicada
   * 2. buscar elementos activos de esa pagina ordenados por sortOrder
   */
  async getPublicPage(slug: string) {
    const page = await this.pageModel.findOne({
      where: { slug, status: 'PUBLISHED' },
    });

    if (!page) {
      throw new NotFoundException({ code: 'CMS_PAGE_NOT_FOUND', message: 'Página no encontrada.' });
    }

    const elements = await this.elementModel.findAll({
      where: { pageId: page.id, status: 'ACTIVE' },
      order: [
        ['sortOrder', 'ASC'],
        ['createdAt', 'ASC'],
      ],
    });

    return {
      ...page.toJSON(),
      elements: elements.map((element) => element.toJSON()),
    };
  }

  async createPage(actorUserId: string, dto: CreatePageDto) {
    return this.pageModel.sequelize!.transaction(async (transaction) => {
      const page = await this.pageModel.create(
        {
          ...dto,
          status: dto.status ?? 'DRAFT',
          publishedAt: dto.status === 'PUBLISHED' ? new Date() : undefined,
          seoMetadata: dto.seoMetadata ?? {},
        } as any,
        { transaction },
      );
      await this.audit.log(
        {
          actorUserId,
          action: 'cms.create_page',
          entityType: 'CmsPage',
          entityId: page.id,
          after: page.toJSON(),
        },
        { transaction },
      );
      return page;
    });
  }

  async addElement(actorUserId: string, pageId: string, dto: CreateElementDto) {
    const page = await this.pageModel.findByPk(pageId);
    if (!page) {
      throw new NotFoundException({ code: 'CMS_PAGE_NOT_FOUND', message: 'Página no encontrada.' });
    }
    return this.elementModel.sequelize!.transaction(async (transaction) => {
      const element = await this.elementModel.create(
        {
          pageId,
          ...dto,
          sortOrder: dto.sortOrder ?? 0,
          status: 'ACTIVE',
        } as any,
        { transaction },
      );
      await this.audit.log(
        {
          actorUserId,
          action: 'cms.add_element',
          entityType: 'CmsElement',
          entityId: element.id,
          after: element.toJSON(),
        },
        { transaction },
      );
      return element;
    });
  }
}
