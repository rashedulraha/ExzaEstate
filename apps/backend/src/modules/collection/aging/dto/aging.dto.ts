import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class QueryAgingDto {
  @ApiPropertyOptional({ example: '2026-03-31' })
  @IsOptional()
  @IsString()
  asOfDate?: string;
}

export class AgingBucketSummaryDto {
  @ApiProperty({ example: 'DAYS_1_7' })
  bucket!: string;

  @ApiProperty({ example: '1–7 Days' })
  label!: string;

  @ApiProperty({ example: '50000000' })
  amountPaisa!: string;

  @ApiProperty({ example: '৳5,00,000.00' })
  amountFormatted!: string;

  @ApiProperty({ example: 4 })
  installmentCount!: number;
}

export class CustomerAgingSummaryDto {
  @ApiProperty()
  customerId!: string;

  @ApiProperty()
  customerName!: string;

  @ApiProperty({ example: '100000000' })
  currentPaisa!: string;

  @ApiProperty({ example: '50000000' })
  days1to7Paisa!: string;

  @ApiProperty({ example: '20000000' })
  days8to30Paisa!: string;

  @ApiProperty({ example: '0' })
  days31to60Paisa!: string;

  @ApiProperty({ example: '0' })
  days61to90Paisa!: string;

  @ApiProperty({ example: '0' })
  days90PlusPaisa!: string;

  @ApiProperty({ example: '170000000' })
  totalPaisa!: string;

  @ApiProperty({ example: '৳17,00,000.00' })
  formattedTotal!: string;
}

export class AgingReportResponseDto {
  @ApiProperty({ example: '2026-03-31' })
  asOfDate!: string;

  @ApiProperty({ example: '500000000' })
  totalReceivablePaisa!: string;

  @ApiProperty({ example: '৳50,00,000.00' })
  totalReceivableFormatted!: string;

  @ApiProperty({ type: [AgingBucketSummaryDto] })
  buckets!: AgingBucketSummaryDto[];

  @ApiProperty({ type: [CustomerAgingSummaryDto] })
  byCustomer!: CustomerAgingSummaryDto[];

  @ApiProperty({ example: true })
  reconciledWithArLedger!: boolean;
}
