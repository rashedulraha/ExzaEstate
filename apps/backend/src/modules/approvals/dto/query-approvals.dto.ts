import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryApprovalsDto {
  @ApiPropertyOptional({
    description:
      'Filter by approval status (PENDING, APPROVED, REJECTED, EXPIRED, AUTO_APPROVED, OVERRIDDEN)',
    example: 'PENDING',
  })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({
    description: 'Filter by approval category type (DISCOUNT, PRICE_EXCEPTION, EXPENSE, REFUND)',
    example: 'DISCOUNT',
  })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({
    description: 'Filter by entity type (Quotation, Booking, Expense, Payment)',
    example: 'Quotation',
  })
  @IsString()
  @IsOptional()
  entityType?: string;

  @ApiPropertyOptional({
    description: 'Search keyword across approval title, number, or description',
    example: 'Unit A-401',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Pagination page number',
    default: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Pagination records per page',
    default: 20,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}
