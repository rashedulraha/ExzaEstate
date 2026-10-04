import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';
import {
  FOLLOW_UP_PRIORITIES,
  FOLLOW_UP_STATUSES,
  FOLLOW_UP_TYPES,
  type FollowUpPriority,
  type FollowUpStatus,
  type FollowUpType,
} from '@exzaestate/shared';

export class QueryFollowUpsDto {
  @ApiPropertyOptional({ description: 'Filter by lead UUID' })
  @IsUUID('all')
  @IsOptional()
  leadId?: string;

  @ApiPropertyOptional({ description: 'Filter by customer UUID' })
  @IsUUID('all')
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Filter by assigned user UUID' })
  @IsUUID('all')
  @IsOptional()
  assignedToId?: string;

  @ApiPropertyOptional({
    description: 'Filter by follow-up status (PENDING, COMPLETED, CANCELLED, MISSED)',
    enum: Object.values(FOLLOW_UP_STATUSES),
  })
  @IsString()
  @IsOptional()
  @IsIn(Object.values(FOLLOW_UP_STATUSES))
  status?: FollowUpStatus;

  @ApiPropertyOptional({
    description: 'Filter by follow-up type',
    enum: Object.values(FOLLOW_UP_TYPES),
  })
  @IsString()
  @IsOptional()
  @IsIn(Object.values(FOLLOW_UP_TYPES))
  type?: FollowUpType;

  @ApiPropertyOptional({
    description: 'Filter by priority',
    enum: Object.values(FOLLOW_UP_PRIORITIES),
  })
  @IsString()
  @IsOptional()
  @IsIn(Object.values(FOLLOW_UP_PRIORITIES))
  priority?: FollowUpPriority;

  @ApiPropertyOptional({
    description:
      'If true, returns only overdue follow-ups (due before today in company timezone and still PENDING)',
  })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  overdueOnly?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by due date from (YYYY-MM-DD)',
    example: '2026-10-01',
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dateFrom must be in YYYY-MM-DD format' })
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter by due date to (YYYY-MM-DD)',
    example: '2026-10-31',
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dateTo must be in YYYY-MM-DD format' })
  dateTo?: string;

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
}
