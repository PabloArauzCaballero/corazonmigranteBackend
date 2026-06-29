import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, MinLength } from 'class-validator';
export class RequestPasswordResetDto {
  @ApiProperty()
  @Transform(({ value }) => String(value).toLowerCase().trim())
  @IsEmail()
  email: string;
}
export class ResetPasswordDto {
  @ApiProperty()
  @Transform(({ value }) => String(value).toLowerCase().trim())
  @IsEmail()
  email: string;
  @ApiProperty({ example: '123456' }) @IsString() @Length(6, 6) pin: string;
  @ApiProperty({ example: 'NuevaClave123!' }) @IsString() @MinLength(8) newPassword: string;
}
