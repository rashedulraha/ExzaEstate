import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CalculatedChargeItemResponseDto {
  @ApiProperty({ description: 'Charge name', example: 'Utility Connection Charge' })
  name!: string;

  @ApiPropertyOptional({ description: 'Catalogue charge type code', example: 'UTILITY' })
  chargeTypeCode?: string;

  @ApiProperty({ description: 'Calculation type (FIXED | PERCENTAGE)', example: 'FIXED' })
  calculationType!: string;

  @ApiProperty({ description: 'Base charge amount in paisa', example: '15000000' })
  baseAmountPaisa!: string;

  @ApiProperty({ description: 'Base charge amount formatted in BDT', example: 'BDT 1,50,000.00' })
  baseAmountFormatted!: string;

  @ApiProperty({ description: 'Applicable VAT rate percentage', example: 5.0 })
  vatRatePct!: number;

  @ApiProperty({ description: 'Calculated VAT amount in paisa', example: '750000' })
  vatAmountPaisa!: string;

  @ApiProperty({ description: 'VAT amount formatted in BDT', example: 'BDT 7,500.00' })
  vatAmountFormatted!: string;

  @ApiProperty({ description: 'Total charge amount in paisa (base + VAT)', example: '15750000' })
  totalAmountPaisa!: string;

  @ApiProperty({ description: 'Total charge amount formatted in BDT', example: 'BDT 1,57,500.00' })
  totalAmountFormatted!: string;

  @ApiProperty({
    description: 'Whether this charge is included in the net property price',
    example: false,
  })
  isIncludedInNetPrice!: boolean;

  @ApiProperty({ description: 'Payable stage', example: 'AT_HANDOVER' })
  payableStage!: string;
}

export class ChargeCalculationSummaryResponseDto {
  @ApiProperty({ description: 'Net property price in paisa', example: '500000000' })
  netPricePaisa!: string;

  @ApiProperty({ description: 'Net property price formatted in BDT', example: 'BDT 50,00,000.00' })
  netPriceFormatted!: string;

  @ApiProperty({ description: 'Total charges included in the net price in paisa', example: '0' })
  totalIncludedChargesPaisa!: string;

  @ApiProperty({ description: 'Total included charges formatted in BDT', example: 'BDT 0.00' })
  totalIncludedChargesFormatted!: string;

  @ApiProperty({
    description: 'Total additional charges base amount in paisa',
    example: '15000000',
  })
  totalAdditionalChargesPaisa!: string;

  @ApiProperty({
    description: 'Total additional charges formatted in BDT',
    example: 'BDT 1,50,000.00',
  })
  totalAdditionalChargesFormatted!: string;

  @ApiProperty({ description: 'Total VAT on charges in paisa', example: '750000' })
  totalVatPaisa!: string;

  @ApiProperty({ description: 'Total VAT formatted in BDT', example: 'BDT 7,500.00' })
  totalVatFormatted!: string;

  @ApiProperty({
    description: 'Grand total payable in paisa (net price + additional charges + VAT)',
    example: '515750000',
  })
  grandTotalPaisa!: string;

  @ApiProperty({ description: 'Grand total formatted in BDT', example: 'BDT 51,57,500.00' })
  grandTotalFormatted!: string;

  @ApiProperty({ description: 'Itemised charges details', type: [CalculatedChargeItemResponseDto] })
  items!: CalculatedChargeItemResponseDto[];
}
