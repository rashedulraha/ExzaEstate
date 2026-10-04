import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PostingRuleResponseDto {
  @ApiProperty({ description: 'Rule UUID', format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'Company UUID', format: 'uuid' })
  companyId!: string;

  @ApiProperty({ description: 'Financial business event type', example: 'BOOKING_CONFIRMED' })
  eventType!: string;

  @ApiProperty({ description: 'Rule name', example: 'Booking Confirmation' })
  ruleName!: string;

  @ApiPropertyOptional({ description: 'Rule description' })
  description?: string | null;

  @ApiPropertyOptional({ description: 'Primary debit account code', example: '1100' })
  debitAccountCode?: string | null;

  @ApiPropertyOptional({ description: 'Primary credit account code', example: '4100' })
  creditAccountCode?: string | null;

  @ApiProperty({
    description: 'Role-based account code mappings',
    example: { receivable: '1100', revenue: '4100' },
  })
  accountMappings!: Record<string, string>;

  @ApiProperty({ description: 'Whether the rule is active', example: true })
  isActive!: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: Date;
}
