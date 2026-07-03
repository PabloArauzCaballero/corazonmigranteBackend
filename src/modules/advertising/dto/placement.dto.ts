import { PartialType } from '@nestjs/swagger';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsObject, IsOptional, IsString, Length } from 'class-validator';
import { toSlug } from '@/common/utils/slug.util';

export class CreateAdsPlacementDto {
  @ApiProperty({ example: 'home_hero' })
  @IsString()
  @Length(2, 80)
  @Transform(({ value }) => toSlug(value).replace(/-/g, '_'))
  code: string;

  @ApiProperty()
  @IsString()
  @Length(2, 140)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ['HOME', 'ARTICLE', 'CATEGORY'] })
  @IsOptional()
  @IsIn(['HOME', 'ARTICLE', 'CATEGORY'])
  context?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  dimensions?: Record<string, unknown>;
}

export class UpdateAdsPlacementDto extends PartialType(CreateAdsPlacementDto) {}
