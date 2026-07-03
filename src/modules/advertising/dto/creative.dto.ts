import { PartialType } from '@nestjs/swagger';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Length,
  Min,
} from 'class-validator';

export class CreateAdsCreativeDto {
  @ApiProperty()
  @IsString()
  @Length(2, 180)
  title: string;

  @ApiPropertyOptional({ enum: ['IMAGE', 'VIDEO', 'HTML', 'NATIVE_CARD'] })
  @IsOptional()
  @IsIn(['IMAGE', 'VIDEO', 'HTML', 'NATIVE_CARD'])
  mediaType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  fileId?: string;

  @ApiProperty()
  @IsUrl({ require_tld: false })
  assetUrl: string;

  @ApiProperty()
  @IsUrl({ require_tld: false })
  destinationUrl: string;

  @ApiProperty()
  @IsString()
  @Length(2, 220)
  altText: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  width?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  height?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sizeBytes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class UpdateAdsCreativeDto extends PartialType(CreateAdsCreativeDto) {}
