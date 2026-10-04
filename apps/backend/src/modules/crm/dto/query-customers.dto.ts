import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { CUSTOMER_TYPES, type CustomerType } from '@exzaestate/shared';

export class QueryCustomersDto {
  @ApiPropertyOptional({ description: 'Page number (default 1)', default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page (default 20, max 100)', default: 20 })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Search term for name, phone, or email' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by customer type (INDIVIDUAL, COMPANY)',
    enum: Object.values(CUSTOMER_TYPES),
  })
  @IsString()
  @IsOptional()
  @IsIn(Object.values(CUSTOMER_TYPES))
  customerType?: CustomerType;

  @ApiPropertyOptional({ description: 'Filter by NRB flag' })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isNrb?: boolean;

  @ApiPropertyOptional({ description: 'Filter by KYC completeness' })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isKycCompleted?: boolean;

  @ApiPropertyOptional({ description: 'Filter by branch UUID' })
  @IsUUID('all')
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({ description: 'Filter by assigned user UUID' })
  @IsUUID('all')
  @IsOptional()
  assignedToId?: string;

  // Blind index exact lookups (equality search via HMAC-SHA256)
  @ApiPropertyOptional({ description: 'Exact equality search by National ID (NID)' })
  @IsString()
  @IsOptional()
  nid?: string;

  @ApiPropertyOptional({ description: 'Exact equality search by Passport number' })
  @IsString()
  @IsOptional()
  passport?: string;

  @ApiPropertyOptional({ description: 'Exact equality search by TIN' })
  @IsString()
  @IsOptional()
  tin?: string;

  @ApiPropertyOptional({ description: 'Exact equality search by Bank account number' })
  @IsString()
  @IsOptional()
  bankAccount?: string;
}
