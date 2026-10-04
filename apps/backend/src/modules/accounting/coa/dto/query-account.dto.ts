import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';
import { ACCOUNT_TYPES, type AccountType } from '@exzaestate/shared';

export class QueryAccountDto {
  @ApiPropertyOptional({
    description: 'Filter by account category',
    enum: Object.values(ACCOUNT_TYPES),
  })
  @IsOptional()
  @IsEnum(ACCOUNT_TYPES)
  type?: AccountType;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Search by account code or title' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by parent account ID' })
  @IsOptional()
  @IsUUID('7')
  parentId?: string;
}
