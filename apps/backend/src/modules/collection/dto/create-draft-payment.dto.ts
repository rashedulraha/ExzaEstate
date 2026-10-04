import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export const PAYMENT_METHODS = [
  'CASH',
  'BANK',
  'CHEQUE',
  'BKASH',
  'NAGAD',
  'CARD',
  'GATEWAY',
  'OTHER',
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_TYPES = [
  'BOOKING_MONEY',
  'DOWN_PAYMENT',
  'INSTALLMENT',
  'CHARGE',
  'OTHER',
] as const;

export type PaymentType = (typeof PAYMENT_TYPES)[number];

export class CreateDraftPaymentDto {
  @ApiPropertyOptional({ description: 'Associated booking ID' })
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @ApiProperty({ description: 'Customer ID making the payment' })
  @IsNotEmpty()
  @IsUUID()
  customerId!: string;

  @ApiPropertyOptional({ description: 'Property ID' })
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiPropertyOptional({ description: 'Project ID' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiProperty({ description: 'Payment amount in integer paisa (e.g. 50000000 = ৳5,00,000)' })
  @IsNotEmpty()
  @IsNumberString({ no_symbols: true })
  amountPaisa!: string;

  @ApiPropertyOptional({
    description: 'Payment type',
    enum: PAYMENT_TYPES,
    default: 'BOOKING_MONEY',
  })
  @IsOptional()
  @IsIn(PAYMENT_TYPES)
  paymentType?: PaymentType = 'BOOKING_MONEY';

  @ApiProperty({
    description: 'Payment method',
    enum: PAYMENT_METHODS,
  })
  @IsNotEmpty()
  @IsIn(PAYMENT_METHODS)
  paymentMethod!: PaymentMethod;

  // Method-specific fields (FLOW-07)
  @ApiPropertyOptional({ description: 'Bank name for Bank / Cheque payment' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  bankName?: string;

  @ApiPropertyOptional({ description: 'Bank branch' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  bankBranch?: string;

  @ApiPropertyOptional({ description: 'Bank account number' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  accountNumber?: string;

  @ApiPropertyOptional({ description: 'Cheque number' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  chequeNumber?: string;

  @ApiPropertyOptional({ description: 'Cheque date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  chequeDate?: string;

  @ApiPropertyOptional({ description: 'Transaction reference ID (bKash/Nagad/Bank)' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  transactionReference?: string;

  @ApiPropertyOptional({ description: 'Card type (VISA/Mastercard/Amex)' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  cardType?: string;

  @ApiPropertyOptional({ description: 'Card last 4 digits' })
  @IsOptional()
  @IsString()
  @MaxLength(4)
  cardLast4?: string;

  @ApiPropertyOptional({ description: 'POS terminal ID' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  posTerminalId?: string;

  @ApiPropertyOptional({
    description: 'Allocation target (BOOKING_AMOUNT, DOWNPAYMENT, INSTALLMENT)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  allocationTarget?: string;

  @ApiPropertyOptional({
    description: 'Target installment ID if allocating to specific installment',
  })
  @IsOptional()
  @IsUUID()
  targetInstallmentId?: string;

  @ApiPropertyOptional({ description: 'Payment date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @ApiPropertyOptional({ description: 'Internal notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
