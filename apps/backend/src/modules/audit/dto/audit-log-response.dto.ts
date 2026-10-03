import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuditLogResponseDto {
  @ApiProperty({ description: 'Audit log UUID', example: '01912345-6789-7abc-def0-123456789abc' })
  id!: string;

  @ApiProperty({
    description: 'Company tenant UUID',
    example: '01912345-6789-7abc-def0-123456789abc',
  })
  companyId!: string;

  @ApiPropertyOptional({
    description: 'Actor user UUID (null for system automated operations)',
    nullable: true,
  })
  actorId!: string | null;

  @ApiProperty({ description: 'Domain module name', example: 'documents' })
  module!: string;

  @ApiProperty({ description: 'Entity or record type', example: 'document' })
  recordType!: string;

  @ApiProperty({
    description: 'Entity or record UUID',
    example: '01912345-6789-7abc-def0-123456789abc',
  })
  recordId!: string;

  @ApiProperty({ description: 'Executed action', example: 'create' })
  action!: string;

  @ApiPropertyOptional({
    description: 'State before mutation (null for creations)',
    nullable: true,
  })
  oldValue!: Record<string, unknown> | null;

  @ApiPropertyOptional({ description: 'State after mutation (null for deletions)', nullable: true })
  newValue!: Record<string, unknown> | null;

  @ApiPropertyOptional({ description: 'Reason for mutation/override', nullable: true })
  reason!: string | null;

  @ApiPropertyOptional({ description: 'Client IP address where available', nullable: true })
  ipAddress!: string | null;

  @ApiProperty({ description: 'Distributed request correlation ID' })
  requestId!: string;

  @ApiProperty({
    description: 'Timestamp when mutation occurred (UTC)',
    example: '2026-10-04T05:00:00.000Z',
  })
  createdAt!: string;
}
