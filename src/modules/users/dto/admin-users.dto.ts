import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '@/common/pagination/pagination.dto';

/**
 * El panel habla en español (PACIENTE, TERAPEUTA, CONTADOR) y la base en inglés
 * (PATIENT, THERAPIST, ACCOUNTANT). Se aceptan las dos formas para no obligar al
 * frontend a traducir antes de enviar; la normalización vive en el servicio.
 */
export const ADMIN_ROLE_INPUTS = [
  'PATIENT',
  'THERAPIST',
  'ADMIN',
  'SUPER_ADMIN',
  'ACCOUNTANT',
  'PACIENTE',
  'TERAPEUTA',
  'CONTADOR',
] as const;

export const USER_STATUS_INPUTS = [
  'ACTIVE',
  'INACTIVE',
  'BLOCKED',
  'PENDING',
  'PENDING_APPROVAL',
] as const;

export class AdminUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ADMIN_ROLE_INPUTS })
  @IsOptional()
  @IsIn(ADMIN_ROLE_INPUTS as unknown as string[])
  role?: string;

  @ApiPropertyOptional({ enum: USER_STATUS_INPUTS })
  @IsOptional()
  @IsIn(USER_STATUS_INPUTS as unknown as string[])
  status?: string;
}

export class AdminCreateUserDto {
  @ApiProperty({ enum: ADMIN_ROLE_INPUTS })
  @IsIn(ADMIN_ROLE_INPUTS as unknown as string[])
  role: string;

  @ApiProperty() @IsEmail() email: string;
  @ApiProperty({ minLength: 8 }) @IsString() @MinLength(8) password: string;
  @ApiProperty() @IsString() firstName: string;
  @ApiProperty() @IsString() lastName: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;

  // Solo terapeutas. El perfil de terapeuta los exige a nivel de base de datos.
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mainSpecialty?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bio?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() personalPhrase?: string;

  @ApiPropertyOptional({ enum: USER_STATUS_INPUTS })
  @IsOptional()
  @IsIn(USER_STATUS_INPUTS as unknown as string[])
  status?: string;
}

export class AdminUpdateUserDto {
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lastName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional({ enum: ADMIN_ROLE_INPUTS })
  @IsOptional()
  @IsIn(ADMIN_ROLE_INPUTS as unknown as string[])
  role?: string;
}

export class AdminUpdateUserStatusDto {
  @ApiProperty({ enum: USER_STATUS_INPUTS })
  @IsIn(USER_STATUS_INPUTS as unknown as string[])
  status: string;
}

export class AdminUpdateAvatarDto {
  @ApiProperty() @IsUUID() avatarFileId: string;
}

/**
 * Restablecimiento de contraseña hecho por administración: no pide la contraseña
 * anterior porque el caso de uso real es justamente que la persona la olvidó.
 * Revoca las sesiones abiertas para que un token viejo no siga sirviendo.
 */
export class AdminResetPasswordDto {
  @ApiProperty({ minLength: 8 }) @IsString() @MinLength(8) newPassword: string;
}
