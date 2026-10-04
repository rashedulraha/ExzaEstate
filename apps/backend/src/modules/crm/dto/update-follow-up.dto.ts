import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import {
  FOLLOW_UP_PRIORITIES,
  FOLLOW_UP_TYPES,
  type FollowUpPriority,
  type FollowUpType,
} from '@exzaestate/shared';

export class UpdateFollowUpDto {
  @ApiPropertyOptional({
    description: 'Type of follow-up interaction',
    enum: Object.values(FOLLOW_UP_TYPES),
  })
  @IsString()
  @IsOptional()
  @IsIn(Object.values(FOLLOW_UP_TYPES))
  type?: FollowUpType;

  @ApiPropertyOptional({
    description: 'Business due date in company timezone (YYYY-MM-DD)',
    example: '2026-10-20',
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dueDate must be in YYYY-MM-DD format' })
  dueDate?: string;

  @ApiPropertyOptional({
    description: 'Optional scheduled time (HH:mm)',
    example: '15:00',
  })
  @IsString()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'dueTime must be in HH:mm format' })
  dueTime?: string;

  @ApiPropertyOptional({
    description: 'Priority level (LOW, MEDIUM, HIGH, URGENT)',
    enum: Object.values(FOLLOW_UP_PRIORITIES),
  })
  @IsString()
  @IsOptional()
  @IsIn(Object.values(FOLLOW_UP_PRIORITIES))
  priority?: FollowUpPriority;

  @ApiPropertyOptional({
    description: 'Notes / agenda / discussion points for the follow-up',
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Assigned employee/agent UUID',
  })
  @IsUUID('all')
  @IsOptional()
  assignedToId?: string;
}
