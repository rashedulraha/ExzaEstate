import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class RequestCancellationDto {
  @ApiProperty({ example: 'Client requested cancellation due to relocation' })
  @IsString()
  reason!: string;

  @ApiPropertyOptional({ example: 10, description: 'Deduction rate percentage (e.g. 10%)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  deductionRatePct?: number;

  @ApiPropertyOptional({
    example: '10000000',
    description: 'Override deduction in paisa (BDT 1,00,000)',
  })
  @IsOptional()
  @IsString()
  deductionPaisa?: string;

  @ApiPropertyOptional({ example: 'AVAILABLE', enum: ['AVAILABLE', 'BLOCKED'] })
  @IsOptional()
  @IsString()
  propertyStatus?: string;
}

export class CancellationPreviewDto {
  @ApiProperty()
  bookingId!: string;

  @ApiProperty()
  bookingNumber!: string;

  @ApiProperty({ example: '500000000' })
  netPricePaisa!: string;

  @ApiProperty({ example: '100000000' })
  paidAmountPaisa!: string;

  @ApiProperty({ example: 10 })
  deductionRatePct!: number;

  @ApiProperty({ example: '10000000' })
  deductionPaisa!: string;

  @ApiProperty({ example: '90000000' })
  refundPaisa!: string;

  @ApiProperty({ example: 'BDT 10,00,000.00' })
  formattedPaidAmount!: string;

  @ApiProperty({ example: 'BDT 1,00,000.00' })
  formattedDeduction!: string;

  @ApiProperty({ example: 'BDT 9,00,000.00' })
  formattedRefund!: string;
}

export class CancellationResultDto {
  @ApiProperty()
  bookingId!: string;

  @ApiProperty()
  bookingNumber!: string;

  @ApiProperty({ example: 'CANCELLED' })
  status!: string;

  @ApiProperty({ example: '100000000' })
  paidAmountPaisa!: string;

  @ApiProperty({ example: '10000000' })
  deductionPaisa!: string;

  @ApiProperty({ example: '90000000' })
  refundPaisa!: string;

  @ApiPropertyOptional()
  refundId?: string;

  @ApiPropertyOptional()
  refundNumber?: string;

  @ApiProperty({ type: [String] })
  journalIds!: string[];
}
