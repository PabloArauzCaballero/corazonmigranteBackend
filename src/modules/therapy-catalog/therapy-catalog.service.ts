import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { TherapyApproach, TherapyProduct } from '@/database/models';
import {
  PaginationQueryDto,
  buildPagination,
  toLimitOffset,
} from '@/common/pagination/pagination.dto';
import { toSlug } from '@/common/utils/slug.util';
import { AuditService } from '../audit/audit.service';
import {
  CreateApproachDto,
  CreateProductDto,
  UpdateApproachDto,
  UpdateProductDto,
} from './dto/therapy.dto';

@Injectable()
export class TherapyCatalogService {
  constructor(
    @InjectModel(TherapyApproach) private readonly approachModel: typeof TherapyApproach,
    @InjectModel(TherapyProduct) private readonly productModel: typeof TherapyProduct,
    private readonly audit: AuditService,
  ) {}

  async listPublicApproaches(query: PaginationQueryDto) {
    return this.listApproaches(query, true);
  }

  async listApproaches(query: PaginationQueryDto, publicOnly = false) {
    const where: any = {};
    if (publicOnly) where.status = 'ACTIVE';
    if (query.search)
      where[Op.or] = [
        { name: { [Op.iLike]: `%${query.search}%` } },
        { description: { [Op.iLike]: `%${query.search}%` } },
      ];
    const { rows, count } = await this.approachModel.findAndCountAll({
      where,
      ...toLimitOffset(query),
      order: [
        ['sortOrder', 'ASC'],
        ['createdAt', 'DESC'],
      ],
    });
    return { items: rows, pagination: buildPagination(query, count) };
  }

  async listProducts(query: PaginationQueryDto, publicOnly = false) {
    const where: any = {};
    if (publicOnly) where.status = 'ACTIVE';
    if (query.search)
      where[Op.or] = [
        { name: { [Op.iLike]: `%${query.search}%` } },
        { description: { [Op.iLike]: `%${query.search}%` } },
      ];
    const { rows, count } = await this.productModel.findAndCountAll({
      where,
      include: [TherapyApproach],
      ...toLimitOffset(query),
      order: [
        ['sortOrder', 'ASC'],
        ['createdAt', 'DESC'],
      ],
    });
    return { items: rows, pagination: buildPagination(query, count) };
  }

  async getProductOrFail(id: string) {
    const product = await this.productModel.findByPk(id);
    if (!product)
      throw new NotFoundException({
        code: 'THERAPY_PRODUCT_NOT_FOUND',
        message: 'Producto no encontrado.',
      });
    return product;
  }

  async createApproach(actorUserId: string, dto: CreateApproachDto) {
    return this.approachModel.sequelize!.transaction(async (transaction) => {
      const approach = await this.approachModel.create(
        {
          ...dto,
          slug: toSlug(dto.name),
          status: dto.status ?? 'ACTIVE',
          sortOrder: dto.sortOrder ?? 0,
        } as any,
        { transaction },
      );
      await this.audit.log(
        {
          actorUserId,
          action: 'therapy.create_approach',
          entityType: 'TherapyApproach',
          entityId: approach.id,
          after: approach.toJSON(),
        },
        { transaction },
      );
      return approach;
    });
  }

  async updateApproach(actorUserId: string, id: string, dto: UpdateApproachDto) {
    const approach = await this.approachModel.findByPk(id);
    if (!approach)
      throw new NotFoundException({
        code: 'THERAPY_APPROACH_NOT_FOUND',
        message: 'Enfoque no encontrado.',
      });
    const before = approach.toJSON();
    return this.approachModel.sequelize!.transaction(async (transaction) => {
      await approach.update({ ...dto, slug: dto.name ? toSlug(dto.name) : approach.slug } as any, {
        transaction,
      });
      await this.audit.log(
        {
          actorUserId,
          action: 'therapy.update_approach',
          entityType: 'TherapyApproach',
          entityId: id,
          before,
          after: dto as any,
        },
        { transaction },
      );
      return approach;
    });
  }

  async createProduct(actorUserId: string, dto: CreateProductDto) {
    const approach = await this.approachModel.findByPk(dto.approachId);
    if (!approach)
      throw new NotFoundException({
        code: 'THERAPY_APPROACH_NOT_FOUND',
        message: 'Enfoque no encontrado.',
      });
    return this.productModel.sequelize!.transaction(async (transaction) => {
      const product = await this.productModel.create(
        {
          ...dto,
          slug: toSlug(dto.name),
          status: dto.status ?? 'ACTIVE',
          currency: dto.currency ?? 'BOB',
          sortOrder: dto.sortOrder ?? 0,
        } as any,
        { transaction },
      );
      await this.audit.log(
        {
          actorUserId,
          action: 'therapy.create_product',
          entityType: 'TherapyProduct',
          entityId: product.id,
          after: product.toJSON(),
        },
        { transaction },
      );
      return product;
    });
  }

  async updateProduct(actorUserId: string, id: string, dto: UpdateProductDto) {
    const product = await this.productModel.findByPk(id);
    if (!product)
      throw new NotFoundException({
        code: 'THERAPY_PRODUCT_NOT_FOUND',
        message: 'Producto no encontrado.',
      });
    const before = product.toJSON();
    return this.productModel.sequelize!.transaction(async (transaction) => {
      await product.update({ ...dto, slug: dto.name ? toSlug(dto.name) : product.slug } as any, {
        transaction,
      });
      await this.audit.log(
        {
          actorUserId,
          action: 'therapy.update_product',
          entityType: 'TherapyProduct',
          entityId: id,
          before,
          after: dto as any,
        },
        { transaction },
      );
      return product;
    });
  }

  async deleteProduct(actorUserId: string, id: string) {
    const product = await this.productModel.findByPk(id);
    if (!product)
      throw new NotFoundException({
        code: 'THERAPY_PRODUCT_NOT_FOUND',
        message: 'Producto no encontrado.',
      });
    return this.productModel.sequelize!.transaction(async (transaction) => {
      await product.destroy({ transaction });
      await this.audit.log(
        {
          actorUserId,
          action: 'therapy.delete_product',
          entityType: 'TherapyProduct',
          entityId: id,
        },
        { transaction },
      );
      return { success: true };
    });
  }
}
