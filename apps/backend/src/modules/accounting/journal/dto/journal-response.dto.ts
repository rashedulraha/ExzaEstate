import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class JournalLineResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 1 })
  lineNumber!: number;

  @ApiProperty({ format: 'uuid' })
  accountId!: string;

  @ApiProperty({ example: '1010' })
  accountCode!: string;

  @ApiProperty({ example: 'Cash in Hand' })
  accountName!: string;

  @ApiProperty({ example: '50000000' })
  debitPaisa!: string;

  @ApiProperty({ example: '0' })
  creditPaisa!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  description?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  partyType?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, format: 'uuid' })
  partyId?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  costCenter?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, format: 'uuid' })
  projectId?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class JournalReversalResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  originalJournalId!: string;

  @ApiProperty({ format: 'uuid' })
  reversalJournalId!: string;

  @ApiProperty()
  reason!: string;

  @ApiProperty()
  reversedAt!: Date;

  @ApiProperty({ format: 'uuid' })
  reversedById!: string;
}

export class JournalResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'JV-2026-2027-000001' })
  journalNumber!: string;

  @ApiProperty({ example: 'GENERAL', enum: ['GENERAL', 'OPENING', 'SYSTEM', 'REVERSAL'] })
  type!: string;

  @ApiProperty({ example: 'Posted', enum: ['Draft', 'Review', 'Posted', 'Locked', 'Reversed'] })
  status!: string;

  @ApiProperty({ example: '2026-10-04' })
  postingDate!: string;

  @ApiPropertyOptional({ type: String, nullable: true, format: 'uuid' })
  periodId?: string | null;

  @ApiProperty({ example: 'Adjustment entry for utility accruals' })
  narration!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  reference?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  sourceModule?: string | null;

  @ApiProperty({ example: '50000000' })
  totalAmount!: string;

  @ApiPropertyOptional({ type: String, nullable: true, format: 'uuid' })
  reversalOfId?: string | null;

  @ApiProperty({ example: false })
  isReversed!: boolean;

  @ApiPropertyOptional({ type: () => JournalReversalResponseDto, nullable: true })
  reversalRecord?: JournalReversalResponseDto | null;

  @ApiPropertyOptional({ type: Date, nullable: true })
  postedAt?: Date | null;

  @ApiPropertyOptional({ type: String, nullable: true, format: 'uuid' })
  postedById?: string | null;

  @ApiPropertyOptional({ type: () => [JournalLineResponseDto] })
  lines?: JournalLineResponseDto[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
