import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { CmsElement, CmsPage } from '@/database/models';
import {
  PaginationQueryDto,
  buildPagination,
  toLimitOffset,
} from '@/common/pagination/pagination.dto';
import { AuditService } from '../audit/audit.service';
import {
  CreateElementDto,
  CreatePageDto,
  UpdateElementDto,
  UpdatePageDto,
} from './dto/cms.dto';

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

  // ---------------------------------------------------------------------------
  // Páginas (administración)
  // ---------------------------------------------------------------------------

  async listPages(query: PaginationQueryDto) {
    const where = query.search
      ? {
          [Op.or]: [
            { slug: { [Op.iLike]: `%${query.search}%` } },
            { title: { [Op.iLike]: `%${query.search}%` } },
          ],
        }
      : undefined;
    const { rows, count } = await this.pageModel.findAndCountAll({
      where: where as any,
      ...toLimitOffset(query),
      order: [[query.sort, query.order]],
    });
    return { items: rows, pagination: buildPagination(query, count) };
  }

  async getPage(pageId: string) {
    const page = await this.findPageOrFail(pageId);
    const elements = await this.elementModel.findAll({
      where: { pageId: page.id },
      order: [
        ['sortOrder', 'ASC'],
        ['createdAt', 'ASC'],
      ],
    });
    return { ...page.toJSON(), elements: elements.map((element) => element.toJSON()) };
  }

  async createPage(actorUserId: string, dto: CreatePageDto) {
    await this.assertSlugAvailable(dto.slug);
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

  async updatePage(actorUserId: string, pageId: string, dto: UpdatePageDto) {
    const page = await this.findPageOrFail(pageId);
    const before = page.toJSON();
    if (dto.slug && dto.slug !== page.slug) await this.assertSlugAvailable(dto.slug);

    return this.pageModel.sequelize!.transaction(async (transaction) => {
      await page.update(
        {
          ...dto,
          // Publicar por primera vez debe dejar constancia de cuándo ocurrió.
          publishedAt:
            dto.status === 'PUBLISHED' && !page.publishedAt ? new Date() : page.publishedAt,
        } as any,
        { transaction },
      );
      await this.audit.log(
        {
          actorUserId,
          action: 'cms.update_page',
          entityType: 'CmsPage',
          entityId: page.id,
          before,
          after: page.toJSON(),
        },
        { transaction },
      );
      return page;
    });
  }

  async deletePage(actorUserId: string, pageId: string) {
    const page = await this.findPageOrFail(pageId);
    const before = page.toJSON();
    await this.pageModel.sequelize!.transaction(async (transaction) => {
      // Los elementos se van con la página: dejarlos huérfanos rompería cualquier
      // reutilización posterior del mismo slug.
      await this.elementModel.destroy({ where: { pageId }, transaction });
      await page.destroy({ transaction });
      await this.audit.log(
        {
          actorUserId,
          action: 'cms.delete_page',
          entityType: 'CmsPage',
          entityId: pageId,
          before,
        },
        { transaction },
      );
    });
    return { success: true, id: pageId };
  }

  // ---------------------------------------------------------------------------
  // Secciones / elementos (administración)
  // ---------------------------------------------------------------------------

  async listElements(pageId: string) {
    await this.findPageOrFail(pageId);
    return this.elementModel.findAll({
      where: { pageId },
      order: [
        ['sortOrder', 'ASC'],
        ['createdAt', 'ASC'],
      ],
    });
  }

  async getElement(pageId: string, elementId: string) {
    const element = await this.elementModel.findOne({ where: { id: elementId, pageId } });
    if (!element)
      throw new NotFoundException({
        code: 'CMS_ELEMENT_NOT_FOUND',
        message: 'Sección no encontrada en esta página.',
      });
    return element;
  }

  async addElement(actorUserId: string, pageId: string, dto: CreateElementDto) {
    await this.findPageOrFail(pageId);
    return this.elementModel.sequelize!.transaction(async (transaction) => {
      const element = await this.elementModel.create(
        {
          pageId,
          ...dto,
          sortOrder: dto.sortOrder ?? 0,
          status: dto.status ?? 'ACTIVE',
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

  /**
   * Guarda los cambios de una sección. `content` se reemplaza completo (el panel
   * envía siempre el objeto entero) en lugar de fusionarse: si se fusionara, borrar
   * un campo desde la interfaz sería imposible.
   */
  async updateElement(
    actorUserId: string,
    pageId: string,
    elementId: string,
    dto: UpdateElementDto,
  ) {
    const element = await this.getElement(pageId, elementId);
    const before = element.toJSON();
    return this.elementModel.sequelize!.transaction(async (transaction) => {
      await element.update({ ...dto } as any, { transaction });
      await this.audit.log(
        {
          actorUserId,
          action: 'cms.update_element',
          entityType: 'CmsElement',
          entityId: element.id,
          before,
          after: element.toJSON(),
        },
        { transaction },
      );
      return element;
    });
  }

  async deleteElement(actorUserId: string, pageId: string, elementId: string) {
    const element = await this.getElement(pageId, elementId);
    const before = element.toJSON();
    await this.elementModel.sequelize!.transaction(async (transaction) => {
      await element.update({ status: 'INACTIVE' } as any, { transaction });
      await element.destroy({ transaction });
      await this.audit.log(
        {
          actorUserId,
          action: 'cms.delete_element',
          entityType: 'CmsElement',
          entityId: elementId,
          before,
        },
        { transaction },
      );
    });
    return { success: true, id: elementId };
  }

  private async findPageOrFail(pageId: string) {
    const page = await this.pageModel.findByPk(pageId);
    if (!page)
      throw new NotFoundException({ code: 'CMS_PAGE_NOT_FOUND', message: 'Página no encontrada.' });
    return page;
  }

  private async assertSlugAvailable(slug: string) {
    const existing = await this.pageModel.findOne({ where: { slug } });
    if (existing)
      throw new BadRequestException({
        code: 'CMS_PAGE_SLUG_TAKEN',
        message: `Ya existe una página con el slug "${slug}".`,
      });
  }
}
