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

export class QuerySecurityEventsDto {
  @ApiPropertyOptional({ description: 'Filter by actor/target user ID' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter by security event type (e.g. LOGIN_SUCCESS, FORBIDDEN)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  eventType?: string;

  @ApiPropertyOptional({ description: 'Filter by severity level (INFO, WARN, ERROR, CRITICAL)' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  severity?: string;

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
