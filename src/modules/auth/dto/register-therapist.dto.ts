import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNumber, IsOptional, IsString, IsUrl, Min, MinLength } from 'class-validator';

export class RegisterTherapistDto {
  @ApiProperty({ example: 'terapeuta@example.com' })
  @Transform(({ value }) => String(value).toLowerCase().trim())
  @IsEmail()
  email: string;
  @ApiProperty({ example: 'Demo123456!' }) @IsString() @MinLength(8) password: string;
  @ApiProperty({ example: 'Lucía' }) @IsString() firstName: string;
  @ApiProperty({ example: 'Mendoza' }) @IsString() lastName: string;
  @ApiPropertyOptional({ example: '+59170000001' }) @IsOptional() @IsString() phone?: string;
  @ApiProperty({ example: 'Psicóloga' }) @IsString() title: string;
  @ApiProperty({ example: 'Terapia familiar' }) @IsString() mainSpecialty: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bio?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() personalPhrase?: string;
  @ApiPropertyOptional() @IsOptional() @IsUrl() youtubeUrl?: string;
  @ApiPropertyOptional({ example: 'MAT-12345' }) @IsOptional() @IsString() licenseNumber?: string;
  @ApiPropertyOptional({ example: 'Bolivia' }) @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional({ example: 'Santa Cruz de la Sierra' })
  @IsOptional()
  @IsString()
  city?: string;
  @ApiPropertyOptional({ example: 180 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  baseSessionPrice?: number;
}
