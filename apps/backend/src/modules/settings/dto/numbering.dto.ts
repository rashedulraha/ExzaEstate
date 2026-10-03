import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateNumberingPatternDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  prefix?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  pattern?: string;

  @IsOptional()
  @IsEnum(['NEVER', 'YEARLY', 'FISCAL_YEARLY'])
  resetRule?: 'NEVER' | 'YEARLY' | 'FISCAL_YEARLY';

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  confirmSeriesChange?: boolean;
}

export class PreviewNumberingQueryDto {
  @IsString()
  @IsNotEmpty()
  documentType!: string;

  @IsOptional()
  @IsString()
  pattern?: string;

  @IsOptional()
  @IsString()
  prefix?: string;

  @IsOptional()
  @IsString()
  branchCode?: string;

  @IsOptional()
  @IsString()
  projectCode?: string;

  @IsOptional()
  @IsString()
  year?: string;
}
