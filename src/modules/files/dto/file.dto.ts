import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
export class UploadFileDto {
  @ApiProperty({ enum: ['USER_PROFILE', 'THERAPY_CATALOG', 'CMS', 'APPOINTMENT'] })
  @IsIn(['USER_PROFILE', 'THERAPY_CATALOG', 'CMS', 'APPOINTMENT'])
  module: string;
  @ApiPropertyOptional() @IsOptional() @IsString() entityType?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() entityId?: string;
  @ApiPropertyOptional({ enum: ['PRIVATE', 'PUBLIC'] })
  @IsOptional()
  @IsIn(['PRIVATE', 'PUBLIC'])
  visibility?: string;
}
