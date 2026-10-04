import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { FacingDirection, PropertyType } from './create-property.dto.js';

export const CANONICAL_PROPERTY_STATUSES = [
  'Available',
  'Hold',
  'Reserved',
  'Booked',
  'Sold',
  'Blocked',
] as const;

export type CanonicalPropertyStatus = (typeof CANONICAL_PROPERTY_STATUSES)[number];

export class QueryPropertyDto {
  @ApiPropertyOptional({ description: 'Filter by project UUID' })
  @IsUUID('all')
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Filter by block or zone UUID' })
  @IsUUID('all')
  @IsOptional()
  blockId?: string;

  @ApiPropertyOptional({ description: 'Filter by road or floor UUID' })
  @IsUUID('all')
  @IsOptional()
  floorId?: string;

  @ApiPropertyOptional({
    description: 'Filter by canonical status',
    enum: CANONICAL_PROPERTY_STATUSES,
  })
  @IsIn(CANONICAL_PROPERTY_STATUSES)
  @IsOptional()
  status?: CanonicalPropertyStatus;

  @ApiPropertyOptional({ description: 'Filter by property type', enum: PropertyType })
  @IsEnum(PropertyType)
  @IsOptional()
  type?: PropertyType;

  @ApiPropertyOptional({ description: 'Filter by facing direction', enum: FacingDirection })
  @IsEnum(FacingDirection)
  @IsOptional()
  facing?: FacingDirection;

  @ApiPropertyOptional({ description: 'Minimum net price in integer paisa' })
  @IsNumberString()
  @IsOptional()
  minPricePaisa?: string;

  @ApiPropertyOptional({ description: 'Maximum net price in integer paisa' })
  @IsNumberString()
  @IsOptional()
  maxPricePaisa?: string;

  @ApiPropertyOptional({ description: 'Search by unit code or title' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Page size limit', default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Sort field',
    enum: ['code', 'createdAt', 'netPricePaisa', 'areaSqft'],
    default: 'code',
  })
  @IsIn(['code', 'createdAt', 'netPricePaisa', 'areaSqft'])
  @IsOptional()
  sortBy?: 'code' | 'createdAt' | 'netPricePaisa' | 'areaSqft' = 'code';

  @ApiPropertyOptional({ description: 'Sort direction', enum: ['asc', 'desc'], default: 'asc' })
  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'asc';
}
