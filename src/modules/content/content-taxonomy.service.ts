import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { ContentCategory, ContentTag } from '@/database/models';
import { toSlug } from '@/common/utils/slug.util';
import { AuditService } from '../audit/audit.service';
import {
  CreateContentCategoryDto,
  CreateContentTagDto,
  UpdateContentCategoryDto,
} from './dto/taxonomy.dto';
import { toCategoryDto, toTagDto } from './mappers/content.mapper';

@Injectable()
export class ContentTaxonomyService {
  constructor(
    @InjectModel(ContentCategory) private readonly categoryModel: typeof ContentCategory,
    @InjectModel(ContentTag) private readonly tagModel: typeof ContentTag,
    private readonly audit: AuditService,
  ) {}

  async listCategories(activeOnly = false) {
    const categories = await this.categoryModel.findAll({
      where: activeOnly ? { isActive: true } : undefined,
      order: [
        ['sortOrder', 'ASC'],
        ['name', 'ASC'],
      ],
    });
    return categories.map(toCategoryDto);
  }

  async createCategory(actorUserId: string, dto: CreateContentCategoryDto) {
    return this.categoryModel.sequelize!.transaction(async (transaction) => {
      const category = await this.categoryModel.create(
        { ...dto, slug: dto.slug ?? toSlug(dto.name), isActive: dto.isActive ?? true } as any,
        { transaction },
      );
      await this.audit.log(
        {
          actorUserId,
          action: 'content.category.create',
          entityType: 'ContentCategory',
          entityId: category.id,
          after: category.toJSON(),
        },
        { transaction },
      );
      return toCategoryDto(category);
    });
  }

  async updateCategory(actorUserId: string, id: string, dto: UpdateContentCategoryDto) {
    const category = await this.findCategory(id);
    const before = category.toJSON();
    return category.sequelize!.transaction(async (transaction) => {
      await category.update(dto as any, { transaction });
      await this.audit.log(
        {
          actorUserId,
          action: 'content.category.update',
          entityType: 'ContentCategory',
          entityId: category.id,
          before,
          after: category.toJSON(),
        },
        { transaction },
      );
      return toCategoryDto(category);
    });
  }

  async listTags() {
    const tags = await this.tagModel.findAll({ order: [['name', 'ASC']] });
    return tags.map(toTagDto);
  }

  async createTag(actorUserId: string, dto: CreateContentTagDto) {
    return this.tagModel.sequelize!.transaction(async (transaction) => {
      const tag = await this.tagModel.create(
        { ...dto, slug: dto.slug ?? toSlug(dto.name) } as any,
        { transaction },
      );
      await this.audit.log(
        {
          actorUserId,
          action: 'content.tag.create',
          entityType: 'ContentTag',
          entityId: tag.id,
          after: tag.toJSON(),
        },
        { transaction },
      );
      return toTagDto(tag);
    });
  }

  async findCategory(id: string) {
    const category = await this.categoryModel.findByPk(id);
    if (!category) {
      throw new NotFoundException({
        code: 'CONTENT_CATEGORY_NOT_FOUND',
        message: 'Categoría no encontrada.',
      });
    }
    return category;
  }
}
