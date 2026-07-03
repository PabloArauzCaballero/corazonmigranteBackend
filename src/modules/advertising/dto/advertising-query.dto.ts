import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '@/common/pagination/pagination.dto';

export class AdvertisingQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'ENDED', 'CANCELLED', 'REJECTED'] })
  @IsOptional()
  @Transform(({ value }) => String(value).toUpperCase())
  @IsIn(['DRAFT', 'ACTIVE', 'PAUSED', 'ENDED', 'CANCELLED', 'REJECTED'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  companyId?: string;
}

export class PublicAdSlotsQueryDto {
  @ApiPropertyOptional({ example: 'home_hero' })
  @IsOptional()
  @IsString()
  placementCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  publicationId?: string;
}
