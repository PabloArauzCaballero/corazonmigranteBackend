import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';

export class CreateAdsCampaignDto {
  @ApiProperty()
  @IsUUID()
  companyId: string;

  @ApiProperty()
  @IsString()
  @Length(2, 180)
  name: string;

  @ApiPropertyOptional({ enum: ['AWARENESS', 'TRAFFIC', 'PUBLIC_SERVICE', 'SPONSORSHIP'] })
  @IsOptional()
  @IsIn(['AWARENESS', 'TRAFFIC', 'PUBLIC_SERVICE', 'SPONSORSHIP'])
  objective?: string;

  @ApiProperty()
  @IsDateString()
  startsAt: string;

  @ApiProperty()
  @IsDateString()
  endsAt: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetAmount?: number;

  @ApiPropertyOptional({ default: 'BOB' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  priority?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID('4', { each: true })
  @Type(() => String)
  placementIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateAdsCampaignDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 180)
  name?: string;

  @ApiPropertyOptional({ enum: ['AWARENESS', 'TRAFFIC', 'PUBLIC_SERVICE', 'SPONSORSHIP'] })
  @IsOptional()
  @IsIn(['AWARENESS', 'TRAFFIC', 'PUBLIC_SERVICE', 'SPONSORSHIP'])
  objective?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  priority?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID('4', { each: true })
  @Type(() => String)
  placementIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class SetAdsCampaignStatusDto {
  @ApiProperty({ enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'ENDED', 'CANCELLED', 'REJECTED'] })
  @IsIn(['DRAFT', 'ACTIVE', 'PAUSED', 'ENDED', 'CANCELLED', 'REJECTED'])
  status: string;
}
