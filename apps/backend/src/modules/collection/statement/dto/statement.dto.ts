import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CustomerStatementQueryDto {
  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsString()
  fromDate?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsString()
  toDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bookingId?: string;
}

export class StatementLineDto {
  @ApiProperty()
  date!: string;

  @ApiProperty()
  reference!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ example: 'BOOKING' })
  type!: string;

  @ApiProperty({ example: '500000000' })
  debitPaisa!: string;

  @ApiProperty({ example: '0' })
  creditPaisa!: string;

  @ApiProperty({ example: '500000000' })
  runningBalancePaisa!: string;

  @ApiProperty({ example: '৳50,00,000.00' })
  formattedDebit!: string;

  @ApiProperty({ example: '৳0.00' })
  formattedCredit!: string;

  @ApiProperty({ example: '৳50,00,000.00' })
  formattedRunningBalance!: string;
}

export class CustomerStatementResponseDto {
  @ApiProperty()
  customerId!: string;

  @ApiProperty()
  customerName!: string;

  @ApiPropertyOptional()
  customerPhone?: string | null;

  @ApiPropertyOptional()
  fromDate?: string;

  @ApiPropertyOptional()
  toDate?: string;

  @ApiProperty({ example: '0' })
  openingBalancePaisa!: string;

  @ApiProperty({ example: '500000000' })
  totalDebitsPaisa!: string;

  @ApiProperty({ example: '50000000' })
  totalCreditsPaisa!: string;

  @ApiProperty({ example: '450000000' })
  closingOutstandingPaisa!: string;

  @ApiProperty({ example: '0' })
  customerAdvancePaisa!: string;

  @ApiProperty({ example: '৳0.00' })
  formattedOpeningBalance!: string;

  @ApiProperty({ example: '৳50,00,000.00' })
  formattedTotalDebits!: string;

  @ApiProperty({ example: '৳5,00,000.00' })
  formattedTotalCredits!: string;

  @ApiProperty({ example: '৳45,00,000.00' })
  formattedClosingOutstanding!: string;

  @ApiProperty({ example: '৳0.00' })
  formattedCustomerAdvance!: string;

  @ApiProperty({ type: [StatementLineDto] })
  lines!: StatementLineDto[];
}

export class ArReconciliationResponseDto {
  @ApiProperty()
  customerId!: string;

  @ApiProperty({ example: '450000000' })
  statementOutstandingPaisa!: string;

  @ApiProperty({ example: '৳45,00,000.00' })
  statementOutstandingFormatted!: string;

  @ApiProperty({ example: '450000000' })
  arLedgerBalancePaisa!: string;

  @ApiProperty({ example: '৳45,00,000.00' })
  arLedgerBalanceFormatted!: string;

  @ApiProperty({ example: '450000000' })
  arAgingTotalPaisa!: string;

  @ApiProperty({ example: '৳45,00,000.00' })
  arAgingTotalFormatted!: string;

  @ApiProperty({ example: '0' })
  differencePaisa!: string;

  @ApiProperty({ example: true })
  isReconciled!: boolean;
}
