import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  Matches,
} from 'class-validator';

export class CreateScheduleDto {
  @ApiProperty({ example: 1 }) @IsInt() @Min(0) @Max(6) weekday: number;
  @ApiProperty({ example: '09:00' }) @Matches(/^\d{2}:\d{2}$/) startTime: string;
  @ApiProperty({ example: '13:00' }) @Matches(/^\d{2}:\d{2}$/) endTime: string;
  @ApiProperty({ example: 'America/La_Paz' }) @IsString() timezone: string;
  @ApiProperty({ example: '2026-07-01' }) @IsDateString() effectiveFrom: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() effectiveTo?: string;
}
export class CreateBlockedTimeDto {
  @ApiProperty() @IsISO8601() startAt: string;
  @ApiProperty() @IsISO8601() endAt: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}
export class AvailabilityQueryDto {
  @ApiProperty() @IsUUID() therapistUserId: string;
  @ApiProperty() @IsUUID() productId: string;
  @ApiProperty({ example: '2026-07-01' }) @IsDateString() from: string;
  @ApiProperty({ example: '2026-07-14' }) @IsDateString() to: string;
  @ApiProperty({ example: 'America/La_Paz' }) @IsString() timezone: string;
}
