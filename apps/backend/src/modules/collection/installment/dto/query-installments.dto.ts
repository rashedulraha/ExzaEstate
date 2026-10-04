import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class QueryInstallmentsDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @ApiPropertyOptional({ enum: ['Unpaid', 'Partially Paid', 'Paid', 'Waived', 'Cancelled'] })
  @IsOptional()
  @IsString()
  paymentState?: string;

  @ApiPropertyOptional({ enum: ['Upcoming', 'Due Today', 'Overdue'] })
  @IsOptional()
  @IsString()
  timingState?: string;

  @ApiPropertyOptional({ example: '2026-10-01', description: 'YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  dueDateFrom?: string;

  @ApiPropertyOptional({ example: '2026-12-31', description: 'YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  dueDateTo?: string;

  @ApiPropertyOptional({
    example: '2026-10-15',
    description: 'Reference date YYYY-MM-DD for timing derivation',
  })
  @IsOptional()
  @IsDateString()
  referenceDate?: string;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 50;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;
}
