import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ACCOUNT_TYPES, type AccountType } from '@exzaestate/shared';

export class LedgerAccountDto {
  @ApiProperty({ description: 'Account UUID' })
  id!: string;

  @ApiProperty({ description: '4-digit account code' })
  code!: string;

  @ApiProperty({ description: 'Account title' })
  name!: string;

  @ApiProperty({ enum: Object.values(ACCOUNT_TYPES) })
  type!: AccountType;

  @ApiProperty({ enum: ['DEBIT', 'CREDIT'] })
  normalBalance!: 'DEBIT' | 'CREDIT';
}

export class LedgerLineDto {
  @ApiProperty({ description: 'Journal line UUID' })
  id!: string;

  @ApiProperty({ description: 'Journal UUID' })
  journalId!: string;

  @ApiProperty({ description: 'Journal sequential number' })
  journalNumber!: string;

  @ApiProperty({ description: 'Business entry date (YYYY-MM-DD)' })
  entryDate!: string;

  @ApiProperty({ description: 'Line or journal description' })
  description!: string;

  @ApiProperty({ description: 'Debit amount in paisa' })
  debitPaisa!: string;

  @ApiProperty({ description: 'Credit amount in paisa' })
  creditPaisa!: string;

  @ApiProperty({ description: 'Debit formatted with lakh/crore' })
  debitFormatted!: string;

  @ApiProperty({ description: 'Credit formatted with lakh/crore' })
  creditFormatted!: string;

  @ApiProperty({ description: 'Running balance in paisa after this line' })
  runningBalancePaisa!: string;

  @ApiProperty({ description: 'Formatted running balance' })
  runningBalanceFormatted!: string;

  @ApiPropertyOptional({ description: 'Cost center code or name' })
  costCenter?: string | null;

  @ApiPropertyOptional({ description: 'Cost center UUID' })
  costCenterId?: string | null;

  @ApiPropertyOptional({ description: 'Project UUID' })
  projectId?: string | null;

  @ApiPropertyOptional({ description: 'Associated party type' })
  partyType?: string | null;

  @ApiPropertyOptional({ description: 'Associated party UUID' })
  partyId?: string | null;
}

export class LedgerReportDto {
  @ApiPropertyOptional({ type: LedgerAccountDto, description: 'Account header details' })
  account?: LedgerAccountDto | null;

  @ApiProperty({ description: 'Opening balance in paisa before startDate' })
  openingBalancePaisa!: string;

  @ApiProperty({ description: 'Opening balance formatted' })
  openingBalanceFormatted!: string;

  @ApiProperty({ description: 'Total debit amount in paisa in the period' })
  totalDebitPaisa!: string;

  @ApiProperty({ description: 'Total debit formatted' })
  totalDebitFormatted!: string;

  @ApiProperty({ description: 'Total credit amount in paisa in the period' })
  totalCreditPaisa!: string;

  @ApiProperty({ description: 'Total credit formatted' })
  totalCreditFormatted!: string;

  @ApiProperty({ description: 'Closing balance in paisa at end of period' })
  closingBalancePaisa!: string;

  @ApiProperty({ description: 'Closing balance formatted' })
  closingBalanceFormatted!: string;

  @ApiProperty({ type: [LedgerLineDto], description: 'Paginated journal line entries' })
  lines!: LedgerLineDto[];

  @ApiPropertyOptional({ description: 'Cursor for next page of lines' })
  nextCursor?: string | null;

  @ApiProperty({ description: 'Whether additional pages are available' })
  hasMore!: boolean;
}

export class ExportJobResponseDto {
  @ApiProperty({ description: 'Asynchronous background job ID' })
  jobId!: string;

  @ApiProperty({ description: 'Queue job status', default: 'QUEUED' })
  status!: string;

  @ApiProperty({ description: 'Descriptive status message' })
  message!: string;
}
