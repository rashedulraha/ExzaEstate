import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ChangeLeadStatusDto {
  @ApiPropertyOptional({
    description:
      'Target lead status (New, Contacted, Interested, Qualified, Site Visit, Negotiation, Booking, Customer, Lost)',
    example: 'Qualified',
  })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({
    description: 'Target lead status alias',
    example: 'Qualified',
  })
  @IsString()
  @IsOptional()
  toStatus?: string;

  @ApiPropertyOptional({
    description: 'Mandatory reason when status is Lost or status transition note',
    example: 'Budget mismatch, opted for competitor',
  })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({
    description: 'Reason alias',
    example: 'Budget mismatch',
  })
  @IsString()
  @IsOptional()
  lostReason?: string;
}
