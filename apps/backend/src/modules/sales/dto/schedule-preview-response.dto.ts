import { ApiProperty } from '@nestjs/swagger';

export class GeneratedScheduleItemDto {
  @ApiProperty({
    description: 'Installment number (0 for booking / down payment, 1..n for installments)',
    example: 1,
  })
  installmentNumber!: number;

  @ApiProperty({ description: 'Descriptive name', example: 'Installment 01' })
  name!: string;

  @ApiProperty({
    description: 'Item payment category',
    enum: ['BOOKING_AMOUNT', 'DOWN_PAYMENT', 'INSTALLMENT', 'SPECIAL'],
    example: 'INSTALLMENT',
  })
  type!: 'BOOKING_AMOUNT' | 'DOWN_PAYMENT' | 'INSTALLMENT' | 'SPECIAL';

  @ApiProperty({ description: 'Amount in paisa (integer string)', example: '18750000' })
  amountPaisa!: string;

  @ApiProperty({ description: 'Bangladeshi Taka formatted amount', example: '৳1,87,500' })
  amountFormatted!: string;

  @ApiProperty({ description: 'Due date in YYYY-MM-DD format', example: '2026-03-01' })
  dueDate!: string;
}

export class SchedulePreviewResponseDto {
  @ApiProperty({ description: 'Net price in paisa', example: '500000000' })
  netPricePaisa!: string;

  @ApiProperty({ description: 'Net price formatted', example: '৳50,00,000' })
  netPriceFormatted!: string;

  @ApiProperty({ description: 'Booking amount in paisa', example: '50000000' })
  bookingAmountPaisa!: string;

  @ApiProperty({ description: 'Booking amount formatted', example: '৳5,00,000' })
  bookingAmountFormatted!: string;

  @ApiProperty({ description: 'Down payment amount in paisa', example: '0' })
  downPaymentPaisa!: string;

  @ApiProperty({ description: 'Down payment formatted', example: '৳0' })
  downPaymentFormatted!: string;

  @ApiProperty({ description: 'Remaining balance in paisa', example: '450000000' })
  remainingPaisa!: string;

  @ApiProperty({ description: 'Remaining balance formatted', example: '৳45,00,000' })
  remainingFormatted!: string;

  @ApiProperty({ description: 'Total number of recurring/milestone installments', example: 24 })
  installmentCount!: number;

  @ApiProperty({ description: 'Payment frequency', example: 'MONTHLY' })
  frequency!: string;

  @ApiProperty({ description: 'Schedule line items', type: [GeneratedScheduleItemDto] })
  items!: GeneratedScheduleItemDto[];

  @ApiProperty({
    description: 'Sum of all scheduled items in paisa (strictly equals netPricePaisa)',
    example: '500000000',
  })
  totalScheduledPaisa!: string;
}
