import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';
export class CreateUiEventDto {
  @ApiPropertyOptional() @IsOptional() @IsString() sessionId?: string;
  @ApiProperty() @IsString() eventName: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() payload?: Record<string, unknown>;
}
