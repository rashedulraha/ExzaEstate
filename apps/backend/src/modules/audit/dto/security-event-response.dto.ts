import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SecurityEventResponseDto {
  @ApiProperty({
    description: 'Security event UUID',
    example: '01912345-6789-7abc-def0-123456789abc',
  })
  id!: string;

  @ApiProperty({
    description: 'Company tenant UUID',
    example: '01912345-6789-7abc-def0-123456789abc',
  })
  companyId!: string;

  @ApiPropertyOptional({
    description: 'Associated user UUID (null for unauthenticated events)',
    nullable: true,
  })
  userId!: string | null;

  @ApiProperty({ description: 'Security event type', example: 'LOGIN_SUCCESS' })
  eventType!: string;

  @ApiProperty({ description: 'Severity level (INFO, WARN, ERROR, CRITICAL)', example: 'INFO' })
  severity!: string;

  @ApiPropertyOptional({ description: 'Security event contextual details', nullable: true })
  details!: Record<string, unknown> | null;

  @ApiPropertyOptional({ description: 'Client IP address where available', nullable: true })
  ipAddress!: string | null;

  @ApiPropertyOptional({ description: 'Client User-Agent string', nullable: true })
  userAgent!: string | null;

  @ApiPropertyOptional({ description: 'Distributed request correlation ID', nullable: true })
  requestId!: string | null;

  @ApiProperty({
    description: 'Timestamp when security event occurred (UTC)',
    example: '2026-10-04T05:00:00.000Z',
  })
  createdAt!: string;
}
