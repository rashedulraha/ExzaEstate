import { ApiProperty } from '@nestjs/swagger';
import { ACCOUNT_TYPES, type AccountType } from '@exzaestate/shared';

export class TrialBalanceRowDto {
  @ApiProperty({ description: 'Account UUID' })
  accountId!: string;

  @ApiProperty({ description: 'Account code' })
  accountCode!: string;

  @ApiProperty({ description: 'Account name' })
  accountName!: string;

  @ApiProperty({ enum: Object.values(ACCOUNT_TYPES) })
  accountType!: AccountType;

  @ApiProperty({ description: 'Opening debit in paisa' })
  openingDebitPaisa!: string;

  @ApiProperty({ description: 'Opening credit in paisa' })
  openingCreditPaisa!: string;

  @ApiProperty({ description: 'Period debit in paisa' })
  periodDebitPaisa!: string;

  @ApiProperty({ description: 'Period credit in paisa' })
  periodCreditPaisa!: string;

  @ApiProperty({ description: 'Closing debit in paisa' })
  closingDebitPaisa!: string;

  @ApiProperty({ description: 'Closing credit in paisa' })
  closingCreditPaisa!: string;

  @ApiProperty({ description: 'Net debit balance in paisa' })
  netDebitPaisa!: string;

  @ApiProperty({ description: 'Net credit balance in paisa' })
  netCreditPaisa!: string;

  @ApiProperty({ description: 'Formatted net debit' })
  netDebitFormatted!: string;

  @ApiProperty({ description: 'Formatted net credit' })
  netCreditFormatted!: string;
}

export class TrialBalanceReportDto {
  @ApiProperty({ description: 'Reporting period start date' })
  startDate!: string;

  @ApiProperty({ description: 'Reporting period end date' })
  endDate!: string;

  @ApiProperty({ type: [TrialBalanceRowDto] })
  rows!: TrialBalanceRowDto[];

  @ApiProperty({ description: 'Total opening debit paisa' })
  totalOpeningDebitPaisa!: string;

  @ApiProperty({ description: 'Total opening credit paisa' })
  totalOpeningCreditPaisa!: string;

  @ApiProperty({ description: 'Total period debit paisa' })
  totalPeriodDebitPaisa!: string;

  @ApiProperty({ description: 'Total period credit paisa' })
  totalPeriodCreditPaisa!: string;

  @ApiProperty({ description: 'Total closing debit paisa' })
  totalClosingDebitPaisa!: string;

  @ApiProperty({ description: 'Total closing credit paisa' })
  totalClosingCreditPaisa!: string;

  @ApiProperty({ description: 'Total debit balance paisa' })
  totalDebitPaisa!: string;

  @ApiProperty({ description: 'Total credit balance paisa' })
  totalCreditPaisa!: string;

  @ApiProperty({ description: 'Formatted total debits' })
  totalDebitFormatted!: string;

  @ApiProperty({ description: 'Formatted total credits' })
  totalCreditFormatted!: string;

  @ApiProperty({ description: 'Whether debits exactly equal credits' })
  isBalanced!: boolean;

  @ApiProperty({ description: 'Difference between total debits and credits in paisa' })
  differencePaisa!: string;
}
