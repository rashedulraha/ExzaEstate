import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class QueryLeadsDto {
  @ApiPropertyOptional({
    description: 'Free-text search across lead name, phone, email, and leadNumber',
    example: 'Kamal',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by lead status', example: 'New' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by lead source', example: 'Facebook' })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiPropertyOptional({ description: 'Filter by assigned user UUID' })
  @IsUUID('all')
  @IsOptional()
  assignedToId?: string;

  @ApiPropertyOptional({ description: 'Filter by branch UUID' })
  @IsUUID('all')
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({ description: 'Filter by preferred project UUID' })
  @IsUUID('all')
  @IsOptional()
  preferredProjectId?: string;

  @ApiPropertyOptional({ description: 'Page number (1-based)', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of items per page', default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Skip offset (alternative to page)' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  offset?: number;
}
