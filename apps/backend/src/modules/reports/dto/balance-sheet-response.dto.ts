import { ApiProperty } from '@nestjs/swagger';

export class BalanceSheetItemDto {
  @ApiProperty({ description: 'Account UUID' })
  accountId!: string;

  @ApiProperty({ description: 'Account code' })
  accountCode!: string;

  @ApiProperty({ description: 'Account name' })
  accountName!: string;

  @ApiProperty({ description: 'Balance in paisa' })
  balancePaisa!: string;

  @ApiProperty({ description: 'Formatted balance' })
  balanceFormatted!: string;
}

export class BalanceSheetAssetsDto {
  @ApiProperty({ type: [BalanceSheetItemDto] })
  currentAssets!: BalanceSheetItemDto[];

  @ApiProperty()
  totalCurrentAssetsPaisa!: string;

  @ApiProperty()
  totalCurrentAssetsFormatted!: string;

  @ApiProperty({ type: [BalanceSheetItemDto] })
  nonCurrentAssets!: BalanceSheetItemDto[];

  @ApiProperty()
  totalNonCurrentAssetsPaisa!: string;

  @ApiProperty()
  totalNonCurrentAssetsFormatted!: string;

  @ApiProperty()
  totalAssetsPaisa!: string;

  @ApiProperty()
  totalAssetsFormatted!: string;
}

export class BalanceSheetLiabilitiesDto {
  @ApiProperty({ type: [BalanceSheetItemDto] })
  currentLiabilities!: BalanceSheetItemDto[];

  @ApiProperty()
  totalCurrentLiabilitiesPaisa!: string;

  @ApiProperty()
  totalCurrentLiabilitiesFormatted!: string;

  @ApiProperty({ type: [BalanceSheetItemDto] })
  nonCurrentLiabilities!: BalanceSheetItemDto[];

  @ApiProperty()
  totalNonCurrentLiabilitiesPaisa!: string;

  @ApiProperty()
  totalNonCurrentLiabilitiesFormatted!: string;

  @ApiProperty()
  totalLiabilitiesPaisa!: string;

  @ApiProperty()
  totalLiabilitiesFormatted!: string;
}

export class BalanceSheetEquityDto {
  @ApiProperty({ type: [BalanceSheetItemDto] })
  items!: BalanceSheetItemDto[];

  @ApiProperty({ description: 'Current period net profit or loss' })
  currentPeriodNetIncomePaisa!: string;

  @ApiProperty()
  currentPeriodNetIncomeFormatted!: string;

  @ApiProperty()
  totalEquityPaisa!: string;

  @ApiProperty()
  totalEquityFormatted!: string;
}

export class BalanceSheetReportDto {
  @ApiProperty({ description: 'Reporting as-of date (YYYY-MM-DD)' })
  asOfDate!: string;

  @ApiProperty({ type: BalanceSheetAssetsDto })
  assets!: BalanceSheetAssetsDto;

  @ApiProperty({ type: BalanceSheetLiabilitiesDto })
  liabilities!: BalanceSheetLiabilitiesDto;

  @ApiProperty({ type: BalanceSheetEquityDto })
  equity!: BalanceSheetEquityDto;

  @ApiProperty()
  totalLiabilitiesAndEquityPaisa!: string;

  @ApiProperty()
  totalLiabilitiesAndEquityFormatted!: string;

  @ApiProperty({ description: 'Whether Assets === Liabilities + Equity' })
  isBalanced!: boolean;

  @ApiProperty({ description: 'Difference in paisa' })
  differencePaisa!: string;
}
