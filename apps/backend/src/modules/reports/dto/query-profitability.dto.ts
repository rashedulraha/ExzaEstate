import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class QueryProfitabilityDto {
  @ApiPropertyOptional({ description: 'Filter by specific project ID (UUID)' })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Start date for revenue/cost recognition (ISO string)' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for revenue/cost recognition (ISO string)' })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}
