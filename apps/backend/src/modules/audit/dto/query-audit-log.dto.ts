import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class QueryAuditLogDto {
  @ApiPropertyOptional({ description: 'Filter by actor user ID' })
  @IsOptional()
  @IsUUID()
  actorId?: string;

  @ApiPropertyOptional({ description: 'Filter by module name (e.g. documents, company, auth)' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  module?: string;

  @ApiPropertyOptional({
    description: 'Filter by record/entity type (e.g. document, project, branch)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  recordType?: string;

  @ApiPropertyOptional({ description: 'Filter by record/entity UUID' })
  @IsOptional()
  @IsUUID()
  recordId?: string;

  @ApiPropertyOptional({ description: 'Filter by action (e.g. create, update, delete, reverse)' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  action?: string;

  @ApiPropertyOptional({ description: 'Start date filter (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date filter (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Opaque cursor string for cursor pagination' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ description: 'Number of records to return (1-100)', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
