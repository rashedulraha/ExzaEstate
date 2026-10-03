import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaginatedCursorResponseDto<T> {
  @ApiProperty({ description: 'List of records for current cursor window', isArray: true })
  items!: T[];

  @ApiPropertyOptional({
    description: 'Opaque cursor token for fetching next page (null if no more records)',
    nullable: true,
  })
  nextCursor!: string | null;

  @ApiProperty({ description: 'Indicates whether more records exist beyond current page' })
  hasMore!: boolean;

  @ApiPropertyOptional({ description: 'Total count of matching records where available' })
  total?: number;
}

export class EntityHistoryResponseDto<T> {
  @ApiProperty({ description: 'Entity record type', example: 'document' })
  recordType!: string;

  @ApiProperty({
    description: 'Entity record UUID',
    example: '01912345-6789-7abc-def0-123456789abc',
  })
  recordId!: string;

  @ApiProperty({ description: 'Chronological list of audit mutations', isArray: true })
  history!: T[];
}
