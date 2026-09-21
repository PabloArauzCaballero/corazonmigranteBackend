import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
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

/**
 * Edición de un horario existente. Todos los campos son opcionales: la persona
 * usuaria puede corregir solo la hora sin volver a enviar el día ni la vigencia.
 * `status` permite desactivar un horario sin borrarlo (queda como histórico y deja
 * de generar disponibilidad).
 */
export class UpdateScheduleDto {
  @ApiPropertyOptional({ example: 1 }) @IsOptional() @IsInt() @Min(0) @Max(6) weekday?: number;
  @ApiPropertyOptional({ example: '09:00' })
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  startTime?: string;
  @ApiPropertyOptional({ example: '13:00' })
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  endTime?: string;
  @ApiPropertyOptional({ example: 'America/La_Paz' }) @IsOptional() @IsString() timezone?: string;
  @ApiPropertyOptional({ example: '2026-07-01' }) @IsOptional() @IsDateString()
  effectiveFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() effectiveTo?: string;
  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: string;
}

export class CreateBlockedTimeDto {
  @ApiProperty() @IsISO8601() startAt: string;
  @ApiProperty() @IsISO8601() endAt: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

export class UpdateBlockedTimeDto {
  @ApiPropertyOptional() @IsOptional() @IsISO8601() startAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsISO8601() endAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: string;
}

export class AvailabilityQueryDto {
  @ApiProperty() @IsUUID() therapistUserId: string;
  @ApiProperty() @IsUUID() productId: string;
  @ApiProperty({ example: '2026-07-01' }) @IsDateString() from: string;
  @ApiProperty({ example: '2026-07-14' }) @IsDateString() to: string;
  @ApiProperty({ example: 'America/La_Paz' }) @IsString() timezone: string;
}
