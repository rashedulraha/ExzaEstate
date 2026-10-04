import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumberString,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class CreateMigrationBatchDto {
  @ApiProperty({ example: '2026-07-01' })
  @IsString()
  goLiveDate!: string;

  @ApiPropertyOptional({ example: 'Initial cut-over migration from legacy spreadsheets' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class OpeningBalanceLineDto {
  @ApiProperty({ example: '1100' })
  @IsString()
  accountCode!: string;

  @ApiProperty({ example: '500000000' })
  @IsNumberString()
  debitPaisa!: string;

  @ApiProperty({ example: '0' })
  @IsNumberString()
  creditPaisa!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ example: 'Opening AR balance for customer' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class PostOpeningBalanceDto {
  @ApiPropertyOptional({ example: '2026-06-30' })
  @IsOptional()
  @IsString()
  postingDate?: string;

  @ApiPropertyOptional({ example: 'Go-Live Opening Balance Journal' })
  @IsOptional()
  @IsString()
  narration?: string;

  @ApiProperty({ type: [OpeningBalanceLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OpeningBalanceLineDto)
  lines!: OpeningBalanceLineDto[];
}

export class HistoricalPaymentItemDto {
  @ApiProperty({ example: '2025-10-15' })
  @IsString()
  date!: string;

  @ApiProperty({ example: '100000000' })
  @IsString()
  amountPaisa!: string;

  @ApiProperty({ example: 'CHEQUE' })
  @IsString()
  method!: string;

  @ApiProperty({ example: 'OLD-REC-4821' })
  @IsString()
  receiptNumber!: string;
}

export class RemainingInstallmentItemDto {
  @ApiProperty({ example: 1 })
  installmentNumber!: number;

  @ApiProperty({ example: '2026-08-01' })
  @IsString()
  dueDate!: string;

  @ApiProperty({ example: '100000000' })
  @IsString()
  amountPaisa!: string;
}

export class AddLegacyBookingDto {
  @ApiProperty()
  @IsString()
  customerId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  propertyId?: string;

  @ApiProperty({ example: 'LEGACY-BKG-001' })
  @IsString()
  legacyBookingNo!: string;

  @ApiProperty({ example: '2025-06-01' })
  @IsString()
  bookingDate!: string;

  @ApiProperty({ example: '500000000' })
  @IsNumberString()
  netPricePaisa!: string;

  @ApiProperty({ example: '200000000' })
  @IsNumberString()
  totalPaidPaisa!: string;

  @ApiPropertyOptional({ type: [HistoricalPaymentItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HistoricalPaymentItemDto)
  historicalPayments?: HistoricalPaymentItemDto[];

  @ApiPropertyOptional({ type: [RemainingInstallmentItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RemainingInstallmentItemDto)
  remainingInstallments?: RemainingInstallmentItemDto[];
}

export class CustomerReconciliationDifferenceDto {
  @ApiProperty()
  customerId!: string;

  @ApiProperty()
  customerName!: string;

  @ApiProperty({ example: '300000000' })
  openingArPaisa!: string;

  @ApiProperty({ example: '300000000' })
  legacyOutstandingPaisa!: string;

  @ApiProperty({ example: '0' })
  differencePaisa!: string;

  @ApiProperty({ example: true })
  isReconciled!: boolean;
}

export class ReconciliationGateResponseDto {
  @ApiProperty()
  batchId!: string;

  @ApiProperty({ example: '300000000' })
  totalOpeningArPaisa!: string;

  @ApiProperty({ example: '৳30,00,000.00' })
  totalOpeningArFormatted!: string;

  @ApiProperty({ example: '300000000' })
  totalLegacyOutstandingPaisa!: string;

  @ApiProperty({ example: '৳30,00,000.00' })
  totalLegacyOutstandingFormatted!: string;

  @ApiProperty({ example: '0' })
  differencePaisa!: string;

  @ApiProperty({ example: '৳0.00' })
  differenceFormatted!: string;

  @ApiProperty({ example: true })
  canFinalize!: boolean;

  @ApiProperty({ type: [CustomerReconciliationDifferenceDto] })
  customerDifferences!: CustomerReconciliationDifferenceDto[];
}

export class FinalizeMigrationBatchDto {
  @ApiPropertyOptional({
    example: 'CEO approved ৳500 rounding difference write-off',
    description: 'Mandatory if difference is not ৳0.00',
  })
  @IsOptional()
  @IsString()
  approvedAdjustmentReason?: string;
}

export class MigrationBatchResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'MIG-2026-00001' })
  batchNumber!: string;

  @ApiProperty({ example: 'Draft' })
  status!: string;

  @ApiProperty({ example: '2026-07-01' })
  goLiveDate!: string;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiPropertyOptional()
  openingJournalId?: string | null;

  @ApiPropertyOptional()
  finalizedAt?: string | null;

  @ApiPropertyOptional()
  finalizedById?: string | null;

  @ApiProperty({ example: 5 })
  legacyBookingCount!: number;

  @ApiProperty()
  createdAt!: string;
}
