import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Página actual. Empieza en 1.' })
  @IsOptional()
  @Transform(({ value }) => Number(value ?? 1))
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    example: 20,
    description: 'Cantidad de registros por página. Nombre recomendado por el backend.',
  })
  @IsOptional()
  @Transform(({ value }) => Number(value ?? 20))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @ApiPropertyOptional({
    example: 20,
    description:
      'Alias compatible con frontend/smoke clásico. Si se envía, tiene prioridad sobre pageSize.',
  })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ example: 'createdAt' })
  @IsOptional()
  @IsString()
  sort = 'createdAt';

  @ApiPropertyOptional({ example: 'desc', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({ example: 'ansiedad' })
  @IsOptional()
  @IsString()
  search?: string;
}

export function getEffectivePageSize(query: PaginationQueryDto) {
  return query.limit ?? query.pageSize ?? 20;
}

export function toLimitOffset(query: PaginationQueryDto) {
  const limit = getEffectivePageSize(query);
  const offset = (query.page - 1) * limit;
  return { limit, offset };
}

export function buildPagination(query: PaginationQueryDto, total: number) {
  const pageSize = getEffectivePageSize(query);
  return {
    page: query.page,
    pageSize,
    limit: pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}
