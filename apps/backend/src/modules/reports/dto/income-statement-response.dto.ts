import { ApiProperty } from '@nestjs/swagger';

export class IncomeStatementItemDto {
  @ApiProperty({ description: 'Account UUID' })
  accountId!: string;

  @ApiProperty({ description: 'Account code' })
  accountCode!: string;

  @ApiProperty({ description: 'Account name' })
  accountName!: string;

  @ApiProperty({ description: 'Account balance in paisa' })
  amountPaisa!: string;

  @ApiProperty({ description: 'Formatted amount' })
  amountFormatted!: string;
}

export class IncomeStatementReportDto {
  @ApiProperty({ description: 'Reporting period start date (YYYY-MM-DD)' })
  startDate!: string;

  @ApiProperty({ description: 'Reporting period end date (YYYY-MM-DD)' })
  endDate!: string;

  @ApiProperty({ type: [IncomeStatementItemDto] })
  revenues!: IncomeStatementItemDto[];

  @ApiProperty()
  totalRevenuePaisa!: string;

  @ApiProperty()
  totalRevenueFormatted!: string;

  @ApiProperty({ type: [IncomeStatementItemDto] })
  costOfSales!: IncomeStatementItemDto[];

  @ApiProperty()
  totalCostOfSalesPaisa!: string;

  @ApiProperty()
  totalCostOfSalesFormatted!: string;

  @ApiProperty()
  grossProfitPaisa!: string;

  @ApiProperty()
  grossProfitFormatted!: string;

  @ApiProperty({ description: 'Gross profit margin percentage' })
  grossProfitMarginPct!: number;

  @ApiProperty({ type: [IncomeStatementItemDto] })
  operatingExpenses!: IncomeStatementItemDto[];

  @ApiProperty()
  totalOperatingExpensesPaisa!: string;

  @ApiProperty()
  totalOperatingExpensesFormatted!: string;

  @ApiProperty({ description: 'Net profit / net income in paisa' })
  netProfitPaisa!: string;

  @ApiProperty()
  netProfitFormatted!: string;

  @ApiProperty({ description: 'Net profit margin percentage' })
  netProfitMarginPct!: number;
}
