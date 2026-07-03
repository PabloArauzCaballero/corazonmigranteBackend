import { Op, WhereOptions } from 'sequelize';
import { ContentPublication } from '@/database/models';
import { ContentPublicationQueryDto, PublicContentQueryDto } from './dto/content-query.dto';

export function buildAdminPublicationWhere(
  query: ContentPublicationQueryDto,
): WhereOptions<ContentPublication> {
  const where: WhereOptions<ContentPublication> = {};
  if (query.status) where.status = query.status;
  if (query.publicationType) where.publicationType = query.publicationType;
  if (query.accessType) where.accessType = query.accessType;
  if (query.authorId) where.authorId = query.authorId;
  if (query.search) where.title = { [Op.iLike]: `%${query.search}%` } as any;
  return where;
}

export function buildPublicPublicationWhere(
  query: PublicContentQueryDto,
  publicationType?: string,
) {
  const where: WhereOptions<ContentPublication> = {
    status: 'PUBLISHED',
    accessType: { [Op.in]: ['PUBLIC', 'PREMIUM'] } as any,
  };
  if (publicationType) where.publicationType = publicationType;
  if (query.q) where.title = { [Op.iLike]: `%${query.q}%` } as any;
  return where;
}
