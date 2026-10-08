import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InstallmentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  companyId!: string;

  @ApiProperty({ format: 'uuid' })
  bookingId!: string;

  @ApiProperty({ example: 1 })
  installmentNumber!: number;

  @ApiProperty({ example: 'Installment 1' })
  name!: string;

  @ApiProperty({
    example: 'REGULAR',
    enum: ['REGULAR', 'BOOKING_AMOUNT', 'DOWN_PAYMENT', 'MILESTONE', 'FINAL_SETTLEMENT', 'SPECIAL'],
  })
  type!: string;

  @ApiProperty({ example: '2026-11-01', description: 'Business date YYYY-MM-DD' })
  dueDate!: string;

  @ApiProperty({ example: '30000000', description: 'BigInt paisa as string' })
  amountPaisa!: string;

  @ApiProperty({ example: 'BDT 3,00,000.00' })
  amountFormatted!: string;

  @ApiProperty({ example: '10000000', description: 'BigInt paisa as string' })
  paidAmountPaisa!: string;

  @ApiProperty({ example: 'BDT 1,00,000.00' })
  paidAmountFormatted!: string;

  @ApiProperty({ example: '20000000', description: 'BigInt paisa as string' })
  remainingAmountPaisa!: string;

  @ApiProperty({ example: 'BDT 2,00,000.00' })
  remainingAmountFormatted!: string;

  @ApiProperty({ example: '0', description: 'BigInt paisa as string' })
  waivedAmountPaisa!: string;

  @ApiProperty({ example: '0', description: 'BigInt paisa as string' })
  lateFeePaisa!: string;

  @ApiProperty({
    example: 'Partially Paid',
    enum: ['Unpaid', 'Partially Paid', 'Paid', 'Waived', 'Cancelled'],
  })
  paymentState!: string;

  @ApiPropertyOptional({
    example: 'Upcoming',
    enum: ['Upcoming', 'Due Today', 'Overdue'],
    nullable: true,
  })
  timingState!: string | null;

  @ApiProperty({ example: 0 })
  overdueDays!: number;

  @ApiProperty({ example: 'Partially Paid · Upcoming' })
  statusLabel!: string;

  @ApiPropertyOptional({ example: 'ROOF_CASTING', nullable: true })
  milestoneEvent?: string | null;

  @ApiProperty({ example: false })
  milestoneCompleted!: boolean;

  @ApiPropertyOptional({ nullable: true })
  milestoneCompletedAt?: string | null;

  @ApiPropertyOptional({ nullable: true })
  notes?: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class InstallmentScheduleSummaryDto {
  @ApiProperty({ format: 'uuid' })
  bookingId!: string;

  @ApiProperty({ example: 24 })
  totalInstallments!: number;

  @ApiProperty({ example: '720000000', description: 'BigInt paisa as string' })
  totalScheduledPaisa!: string;

  @ApiProperty({ example: 'BDT 72,00,000.00' })
  totalScheduledFormatted!: string;

  @ApiProperty({ example: '10000000' })
  totalPaidPaisa!: string;

  @ApiProperty({ example: 'BDT 1,00,000.00' })
  totalPaidFormatted!: string;

  @ApiProperty({ example: '710000000' })
  totalRemainingPaisa!: string;

  @ApiProperty({ example: 'BDT 71,00,000.00' })
  totalRemainingFormatted!: string;

  @ApiProperty({ type: [InstallmentResponseDto] })
  items!: InstallmentResponseDto[];
}
