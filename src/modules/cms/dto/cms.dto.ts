import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsObject, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreatePageDto {
  @ApiProperty() @IsString() slug: string;
  @ApiProperty() @IsString() title: string;
  @ApiPropertyOptional({ enum: ['DRAFT', 'PUBLISHED'] })
  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED'])
  status?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() seoMetadata?: Record<string, unknown>;
}

export class UpdatePageDto {
  @ApiPropertyOptional() @IsOptional() @IsString() slug?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional({ enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] })
  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  status?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() seoMetadata?: Record<string, unknown>;
}

export class CreateElementDto {
  @ApiProperty() @IsString() code: string;
  @ApiProperty() @IsString() type: string;
  @ApiProperty() @IsObject() content: Record<string, unknown>;
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === null ? value : Number(value)))
  @IsInt()
  @Min(0)
  sortOrder?: number;
  @ApiPropertyOptional() @IsOptional() @IsUUID() fileId?: string;
  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: string;
}

/**
 * Edición de una sección ya publicada. Todo es opcional para que el panel pueda
 * guardar solo el campo que la persona tocó: cambiar el texto de un bloque no debe
 * obligar a reenviar su `code` ni su `type`.
 */
export class UpdateElementDto {
  @ApiPropertyOptional() @IsOptional() @IsString() code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() content?: Record<string, unknown>;
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === null ? value : Number(value)))
  @IsInt()
  @Min(0)
  sortOrder?: number;
  @ApiPropertyOptional() @IsOptional() @IsUUID() fileId?: string;
  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: string;
}
