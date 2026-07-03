import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class HomepageQueryDto {
  @ApiPropertyOptional({ default: 6 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  headlineLimit?: number = 6;

  @ApiPropertyOptional({ default: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  columnLimit?: number = 4;
}

export class HomepageFeaturedItemDto {
  @ApiProperty({ enum: ['CONTENT_PUBLICATION', 'ADS_CAMPAIGN', 'ADS_CREATIVE'] })
  @IsIn(['CONTENT_PUBLICATION', 'ADS_CAMPAIGN', 'ADS_CREATIVE'])
  itemType: string;

  @ApiProperty()
  @IsUUID()
  itemId: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class HomepageSectionDto {
  @ApiProperty()
  @IsString()
  @Length(2, 80)
  code: string;

  @ApiProperty()
  @IsString()
  @Length(2, 140)
  title: string;

  @ApiProperty({ enum: ['HEADLINES', 'COLUMNS', 'ADS', 'CUSTOM'] })
  @IsIn(['HEADLINES', 'COLUMNS', 'ADS', 'CUSTOM'])
  type: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ type: [HomepageFeaturedItemDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => HomepageFeaturedItemDto)
  items?: HomepageFeaturedItemDto[];
}

export class UpdateHomepageLayoutDto {
  @ApiProperty({ type: [HomepageSectionDto] })
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => HomepageSectionDto)
  sections: HomepageSectionDto[];
}
