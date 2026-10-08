import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaymentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  paymentNumber!: string;

  @ApiPropertyOptional()
  bookingId?: string | null;

  @ApiProperty()
  customerId!: string;

  @ApiPropertyOptional()
  propertyId?: string | null;

  @ApiPropertyOptional()
  projectId?: string | null;

  @ApiProperty({ description: 'Payment amount in integer paisa as string' })
  amountPaisa!: string;

  @ApiProperty({ description: 'Formatted amount in BDT (e.g. BDT 5,00,000)' })
  formattedAmount!: string;

  @ApiProperty()
  paymentType!: string;

  @ApiProperty()
  paymentMethod!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  isDraft!: boolean;

  @ApiPropertyOptional()
  bankName?: string | null;

  @ApiPropertyOptional()
  bankBranch?: string | null;

  @ApiPropertyOptional()
  accountNumber?: string | null;

  @ApiPropertyOptional()
  chequeNumber?: string | null;

  @ApiPropertyOptional()
  chequeDate?: string | null;

  @ApiPropertyOptional()
  chequeStatus?: string | null;

  @ApiPropertyOptional()
  transactionReference?: string | null;

  @ApiPropertyOptional()
  cardType?: string | null;

  @ApiPropertyOptional()
  cardLast4?: string | null;

  @ApiPropertyOptional()
  posTerminalId?: string | null;

  @ApiPropertyOptional()
  allocationTarget?: string | null;

  @ApiPropertyOptional()
  targetInstallmentId?: string | null;

  @ApiPropertyOptional()
  receiptId?: string | null;

  @ApiPropertyOptional()
  journalId?: string | null;

  @ApiProperty()
  paymentDate!: string;

  @ApiPropertyOptional()
  receivedAt?: string | null;

  @ApiPropertyOptional()
  postedAt?: string | null;

  @ApiPropertyOptional()
  postedById?: string | null;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  createdById!: string;
}
