import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import {
  ContentAuthor,
  ContentCategory,
  ContentPublicationTag,
  ContentTag,
} from '@/database/models';

@Injectable()
export class ContentPublicationRelationsService {
  constructor(
    @InjectModel(ContentPublicationTag)
    private readonly publicationTagModel: typeof ContentPublicationTag,
    @InjectModel(ContentCategory) private readonly categoryModel: typeof ContentCategory,
    @InjectModel(ContentTag) private readonly tagModel: typeof ContentTag,
    @InjectModel(ContentAuthor) private readonly authorModel: typeof ContentAuthor,
  ) {}

  async assertReferences(authorId?: string, categoryId?: string, tagIds?: string[]) {
    if (authorId && !(await this.authorModel.findByPk(authorId))) {
      throw new NotFoundException({
        code: 'CONTENT_AUTHOR_NOT_FOUND',
        message: 'Autor no encontrado.',
      });
    }
    if (categoryId && !(await this.categoryModel.findByPk(categoryId))) {
      throw new NotFoundException({
        code: 'CONTENT_CATEGORY_NOT_FOUND',
        message: 'Categoría no encontrada.',
      });
    }
    if (tagIds?.length) await this.assertTags(tagIds);
  }

  async replaceTags(publicationId: string, tagIds: string[], transaction: unknown) {
    await this.publicationTagModel.destroy({
      where: { publicationId },
      transaction: transaction as any,
    });
    const uniqueTagIds = [...new Set(tagIds)];
    if (!uniqueTagIds.length) return;
    const rows = uniqueTagIds.map((tagId) => ({ publicationId, tagId }));
    await this.publicationTagModel.bulkCreate(rows as any[], { transaction: transaction as any });
  }

  private async assertTags(tagIds: string[]) {
    const count = await this.tagModel.count({ where: { id: tagIds } });
    if (count !== new Set(tagIds).size) {
      throw new NotFoundException({
        code: 'CONTENT_TAG_NOT_FOUND',
        message: 'Una o más etiquetas no existen.',
      });
    }
  }
}
