import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
export class CreateAccountGroupDto {
  @ApiProperty() @IsString() code: string;
  @ApiProperty() @IsString() name: string;
  @ApiProperty({ enum: ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'] })
  @IsIn(['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'])
  type: string;
}
export class CreateAccountDto {
  @ApiProperty() @IsUUID() groupId: string;
  @ApiProperty() @IsString() code: string;
  @ApiProperty() @IsString() name: string;
  @ApiProperty({ enum: ['DEBIT', 'CREDIT'] }) @IsIn(['DEBIT', 'CREDIT']) normalBalance: string;
}
export class CreateCostCenterDto {
  @ApiProperty() @IsString() code: string;
  @ApiProperty() @IsString() name: string;
}
export class EntryDto {
  @ApiProperty() @IsUUID() accountId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() costCenterId?: string;
  @ApiProperty() @IsNumber() @Min(0) debit: number;
  @ApiProperty() @IsNumber() @Min(0) credit: number;
}
export class CreateTransactionDto {
  @ApiProperty() @IsDateString() date: string;
  @ApiProperty() @IsString() description: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reference?: string;
  @ApiProperty({ type: [EntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EntryDto)
  entries: EntryDto[];
}
