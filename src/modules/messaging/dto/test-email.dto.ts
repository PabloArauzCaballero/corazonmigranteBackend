import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class SendTestEmailDto {
  @IsEmail()
  recipient!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  subject?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  text?: string;
}
