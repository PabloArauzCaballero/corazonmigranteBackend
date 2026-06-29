import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator';
export class CreateAppointmentDto {
  @ApiProperty() @IsUUID() therapistUserId: string;
  @ApiProperty() @IsUUID() productId: string;
  @ApiProperty() @IsISO8601() scheduledStartAt: string;
  @ApiProperty({ example: 'America/La_Paz' }) @IsString() timezone: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notesForTherapist?: string;
}
export class UpdateAppointmentStatusDto {
  @ApiProperty({
    enum: [
      'CONFIRMED',
      'COMPLETED',
      'CANCELLED_BY_PATIENT',
      'CANCELLED_BY_ADMIN',
      'CANCELLED_BY_THERAPIST',
      'NO_SHOW',
    ],
  })
  @IsIn([
    'CONFIRMED',
    'COMPLETED',
    'CANCELLED_BY_PATIENT',
    'CANCELLED_BY_ADMIN',
    'CANCELLED_BY_THERAPIST',
    'NO_SHOW',
  ])
  status: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}
