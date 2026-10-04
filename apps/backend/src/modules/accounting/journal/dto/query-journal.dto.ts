import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import {
  JOURNAL_STATUSES,
  JOURNAL_TYPES,
  type JournalStatus,
  type JournalType,
} from '@exzaestate/shared';

export class QueryJournalDto {
  @ApiPropertyOptional({ enum: JOURNAL_STATUSES })
  @IsOptional()
  @IsEnum(JOURNAL_STATUSES)
  status?: JournalStatus;

  @ApiPropertyOptional({ enum: JOURNAL_TYPES })
  @IsOptional()
  @IsEnum(JOURNAL_TYPES)
  type?: JournalType;

  @ApiPropertyOptional({ description: 'Filter by account UUID', format: 'uuid' })
  @IsOptional()
  @IsUUID('7')
  accountId?: string;

  @ApiPropertyOptional({ description: 'Filter by project UUID', format: 'uuid' })
  @IsOptional()
  @IsUUID('7')
  projectId?: string;

  @ApiPropertyOptional({ description: 'Posting date start (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Posting date end (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Search keyword (journal number, narration, reference)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit: number = 50;
}
