import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  ValidateIf,
} from 'class-validator';
import { toSlug } from '@/common/utils/slug.util';

export class CreateContentPublicationDto {
  @ApiProperty()
  @IsUUID()
  authorId: string;

  @ApiProperty()
  @IsUUID()
  categoryId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  coverFileId?: string;

  @ApiProperty({ example: 'Nueva historia de apoyo migrante' })
  @IsString()
  @Length(4, 220)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(4, 240)
  @Transform(({ value, obj }) => toSlug(value ?? obj.title))
  slug?: string;

  @ApiProperty()
  @IsString()
  @Length(10, 1000)
  summary: string;

  @ApiProperty()
  @IsString()
  @Length(20, 50000)
  body: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  audioTranscript?: string;

  @ApiPropertyOptional({ enum: ['NEWS', 'COLUMN', 'OPINION', 'INTERVIEW', 'REPORT', 'ANALYSIS'] })
  @IsOptional()
  @Transform(({ value }) => String(value ?? 'NEWS').toUpperCase())
  @IsIn(['NEWS', 'COLUMN', 'OPINION', 'INTERVIEW', 'REPORT', 'ANALYSIS'])
  publicationType?: string;

  @ApiPropertyOptional({ enum: ['PUBLIC', 'PREMIUM', 'INTERNAL_ONLY'] })
  @IsOptional()
  @Transform(({ value }) => String(value ?? 'PUBLIC').toUpperCase())
  @IsIn(['PUBLIC', 'PREMIUM', 'INTERNAL_ONLY'])
  accessType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  commentsEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  reactionsEnabled?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID('4', { each: true })
  @Type(() => String)
  tagIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  seoMetadata?: Record<string, unknown>;
}

export class UpdateContentPublicationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  authorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  coverFileId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(4, 220)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(4, 240)
  @Transform(({ value }) => (value ? toSlug(value) : value))
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(10, 1000)
  summary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(20, 50000)
  body?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  audioTranscript?: string;

  @ApiPropertyOptional({ enum: ['NEWS', 'COLUMN', 'OPINION', 'INTERVIEW', 'REPORT', 'ANALYSIS'] })
  @IsOptional()
  @Transform(({ value }) => String(value).toUpperCase())
  @IsIn(['NEWS', 'COLUMN', 'OPINION', 'INTERVIEW', 'REPORT', 'ANALYSIS'])
  publicationType?: string;

  @ApiPropertyOptional({ enum: ['PUBLIC', 'PREMIUM', 'INTERNAL_ONLY'] })
  @IsOptional()
  @Transform(({ value }) => String(value).toUpperCase())
  @IsIn(['PUBLIC', 'PREMIUM', 'INTERNAL_ONLY'])
  accessType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  commentsEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  reactionsEnabled?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID('4', { each: true })
  @Type(() => String)
  tagIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  seoMetadata?: Record<string, unknown>;
}

export class SchedulePublicationDto {
  @ApiProperty()
  @IsDateString()
  @ValidateIf((dto) => Boolean(dto.scheduledAt))
  scheduledAt: string;
}
