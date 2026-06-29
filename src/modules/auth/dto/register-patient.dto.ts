import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterPatientDto {
  @ApiProperty({ example: 'nuevo@example.com' })
  @Transform(({ value }) => String(value).toLowerCase().trim())
  @IsEmail()
  email: string;
  @ApiProperty({ example: 'Demo123456!' }) @IsString() @MinLength(8) password: string;
  @ApiProperty({ example: 'Ana' }) @IsString() firstName: string;
  @ApiProperty({ example: 'Rojas' }) @IsString() lastName: string;
  @ApiPropertyOptional({ example: '+59170000000' }) @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional({ example: '1998-01-20' }) @IsOptional() @IsDateString() birthDate?: string;
  @ApiPropertyOptional({ example: 'Bolivia' }) @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional({ example: 'Santa Cruz de la Sierra' })
  @IsOptional()
  @IsString()
  city?: string;
  @ApiPropertyOptional({ example: 'Estudiante' }) @IsOptional() @IsString() occupation?: string;
}
