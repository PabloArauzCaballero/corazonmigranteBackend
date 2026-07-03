import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '@/common/pagination/pagination.dto';

export class ContentPublicationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['NEWS', 'COLUMN', 'OPINION', 'INTERVIEW', 'REPORT', 'ANALYSIS'] })
  @IsOptional()
  @Transform(({ value }) => String(value).toUpperCase())
  @IsIn(['NEWS', 'COLUMN', 'OPINION', 'INTERVIEW', 'REPORT', 'ANALYSIS'])
  publicationType?: string;

  @ApiPropertyOptional({ enum: ['DRAFT', 'IN_REVIEW', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED'] })
  @IsOptional()
  @Transform(({ value }) => String(value).toUpperCase())
  @IsIn(['DRAFT', 'IN_REVIEW', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED'])
  status?: string;

  @ApiPropertyOptional({ enum: ['PUBLIC', 'PREMIUM', 'INTERNAL_ONLY'] })
  @IsOptional()
  @Transform(({ value }) => String(value).toUpperCase())
  @IsIn(['PUBLIC', 'PREMIUM', 'INTERNAL_ONLY'])
  accessType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categorySlug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tagSlug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  authorId?: string;
}

export class PublicContentQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categorySlug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tagSlug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;
}
