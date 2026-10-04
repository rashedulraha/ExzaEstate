import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CustomerTimelineItemDto {
  @ApiProperty({ description: 'Unique identifier of the timeline activity' })
  id!: string;

  @ApiProperty({
    description: 'Category/type of activity event',
    example: 'LEAD_CAPTURED',
  })
  type!: string;

  @ApiProperty({ description: 'Activity summary headline' })
  title!: string;

  @ApiPropertyOptional({ description: 'Detailed activity description or outcome' })
  description?: string;

  @ApiProperty({ description: 'Timestamp when activity occurred in ISO 8601 format' })
  timestamp!: string;

  @ApiPropertyOptional({ description: 'Actor user ID who performed or logged the activity' })
  actorId?: string | null;

  @ApiPropertyOptional({ description: 'Actor full name if known' })
  actorName?: string | null;

  @ApiPropertyOptional({
    description: 'Arbitrary structured metadata for this activity event',
    type: Object,
  })
  metadata?: Record<string, unknown>;
}

export class CustomerTimelineResponseDto {
  @ApiProperty({ description: 'Target customer ID' })
  customerId!: string;

  @ApiProperty({ description: 'Target customer number' })
  customerNumber!: string;

  @ApiProperty({ description: 'Total count of timeline activity items' })
  totalEvents!: number;

  @ApiProperty({
    description: 'Unified chronologically sorted activity list (newest first)',
    type: [CustomerTimelineItemDto],
  })
  items!: CustomerTimelineItemDto[];
}
