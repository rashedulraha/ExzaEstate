import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FollowUpResponseDto {
  @ApiProperty({ example: '01a104e7-bb18-7b90-b98a-12a45b67c89d' })
  id!: string;

  @ApiProperty({ example: '01a104e7-bb18-7b90-b98a-12a45b67c800' })
  companyId!: string;

  @ApiPropertyOptional({ example: '01a104e7-bb18-7b90-b98a-12a45b67c89d' })
  leadId?: string | null;

  @ApiPropertyOptional({ example: 'Engr. Tariqul Islam' })
  leadName?: string | null;

  @ApiPropertyOptional({ example: null })
  customerId?: string | null;

  @ApiProperty({ example: 'CALL' })
  type!: string;

  @ApiProperty({ example: 'PENDING' })
  status!: string;

  @ApiProperty({ example: 'HIGH' })
  priority!: string;

  @ApiProperty({ example: '2026-10-15', description: 'Business date in YYYY-MM-DD format' })
  dueDate!: string;

  @ApiPropertyOptional({ example: '14:30' })
  dueTime?: string | null;

  @ApiPropertyOptional({ example: 'Discuss floor layout and pricing discount.' })
  notes?: string | null;

  @ApiPropertyOptional({ example: 'Client requested brochure and payment schedule.' })
  outcome?: string | null;

  @ApiProperty({
    example: false,
    description: 'True if status is PENDING and dueDate is past today in company timezone',
  })
  isOverdue!: boolean;

  @ApiPropertyOptional({ example: '2026-10-15T09:30:00.000Z' })
  completedAt?: string | null;

  @ApiPropertyOptional({ example: '01a104e7-bb18-7b90-b98a-12a45b67c89d' })
  completedById?: string | null;

  @ApiPropertyOptional({ example: '2026-10-25' })
  nextFollowUpDate?: string | null;

  @ApiProperty({ example: '01a104e7-bb18-7b90-b98a-12a45b67c89d' })
  assignedToId!: string;

  @ApiPropertyOptional({ example: '01a104e7-bb18-7b90-b98a-12a45b67c89d' })
  createdById?: string | null;

  @ApiProperty({ example: '2026-10-04T08:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-10-04T08:00:00.000Z' })
  updatedAt!: string;
}
