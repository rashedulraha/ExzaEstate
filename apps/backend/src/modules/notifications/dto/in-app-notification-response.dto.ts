import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InAppNotificationResponseDto {
  @ApiProperty({ description: 'Notification UUIDv7 ID' })
  id!: string;

  @ApiProperty({ description: 'Company UUID' })
  companyId!: string;

  @ApiProperty({ description: 'User UUID of recipient' })
  userId!: string;

  @ApiProperty({ description: 'Domain event code', example: 'booking.confirmed' })
  eventCode!: string;

  @ApiProperty({ description: 'Rendered notification title' })
  title!: string;

  @ApiProperty({ description: 'Rendered notification body' })
  body!: string;

  @ApiPropertyOptional({ description: 'Structured metadata and link targets' })
  data?: Record<string, unknown> | null;

  @ApiProperty({ description: 'Whether notification has been marked as read' })
  isRead!: boolean;

  @ApiPropertyOptional({ description: 'Timestamp when notification was read' })
  readAt?: string | null;

  @ApiProperty({ description: 'Timestamp when notification was created' })
  createdAt!: string;
}
