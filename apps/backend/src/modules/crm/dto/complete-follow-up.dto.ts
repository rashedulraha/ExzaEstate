import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { FOLLOW_UP_TYPES, type FollowUpType } from '@exzaestate/shared';

export class CompleteFollowUpDto {
  @ApiProperty({
    description: 'Outcome / summary / minutes of the interaction (mandatory)',
    example: 'Client requested revised quotation with parking space included.',
  })
  @IsString()
  @IsNotEmpty()
  outcome!: string;

  @ApiPropertyOptional({
    description: 'Optional date for the next follow-up (YYYY-MM-DD)',
    example: '2026-10-25',
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'nextFollowUpDate must be in YYYY-MM-DD format' })
  nextFollowUpDate?: string;

  @ApiPropertyOptional({
    description: 'Optional type for the next follow-up',
    enum: Object.values(FOLLOW_UP_TYPES),
    example: 'MEETING',
  })
  @IsString()
  @IsOptional()
  @IsIn(Object.values(FOLLOW_UP_TYPES))
  nextFollowUpType?: FollowUpType;

  @ApiPropertyOptional({
    description: 'Optional notes for the next follow-up',
  })
  @IsString()
  @IsOptional()
  nextFollowUpNotes?: string;
}
