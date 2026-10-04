import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import {
  FOLLOW_UP_PRIORITIES,
  FOLLOW_UP_TYPES,
  type FollowUpPriority,
  type FollowUpType,
} from '@exzaestate/shared';

export class CreateFollowUpDto {
  @ApiPropertyOptional({
    description: 'Target lead UUID',
    example: '01a104e7-bb18-7b90-b98a-12a45b67c89d',
  })
  @IsUUID('all')
  @IsOptional()
  leadId?: string;

  @ApiPropertyOptional({ description: 'Target customer UUID (for Customer 360)' })
  @IsUUID('all')
  @IsOptional()
  customerId?: string;

  @ApiProperty({
    description: 'Type of follow-up interaction',
    enum: Object.values(FOLLOW_UP_TYPES),
    example: 'CALL',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(Object.values(FOLLOW_UP_TYPES))
  type!: FollowUpType;

  @ApiProperty({
    description: 'Business due date in company timezone (YYYY-MM-DD)',
    example: '2026-10-15',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dueDate must be in YYYY-MM-DD format' })
  dueDate!: string;

  @ApiPropertyOptional({
    description: 'Optional scheduled time (HH:mm)',
    example: '14:30',
  })
  @IsString()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'dueTime must be in HH:mm format' })
  dueTime?: string;

  @ApiPropertyOptional({
    description: 'Priority level (LOW, MEDIUM, HIGH, URGENT)',
    enum: Object.values(FOLLOW_UP_PRIORITIES),
    default: 'MEDIUM',
  })
  @IsString()
  @IsOptional()
  @IsIn(Object.values(FOLLOW_UP_PRIORITIES))
  priority?: FollowUpPriority;

  @ApiPropertyOptional({
    description: 'Notes / agenda / discussion points for the follow-up',
    example: 'Discuss 3-bedroom flat pricing and handover schedule.',
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Assigned employee/agent UUID (defaults to authenticated user if omitted)',
  })
  @IsUUID('all')
  @IsOptional()
  assignedToId?: string;
}
