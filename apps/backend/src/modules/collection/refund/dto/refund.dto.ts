import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumberString, IsOptional, IsString } from 'class-validator';


export enum RefundStatus {
  REQUESTED = 'Requested',
  APPROVED = 'Approved',
  PAID = 'Paid',
  REJECTED = 'Rejected',
}

export class PayRefundDto {
  @ApiProperty({ example: 'BANK_TRANSFER', enum: ['BANK_TRANSFER', 'CHEQUE', 'CASH'] })
  @IsString()
  paymentMethod!: 'BANK_TRANSFER' | 'CHEQUE' | 'CASH';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankAccountId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankAccountCode?: string;

  @ApiPropertyOptional({ example: 'CHQ-987654' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class QueryRefundDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bookingId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ enum: RefundStatus })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsNumberString()
  limit?: string;
}

export class RefundResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: string;

  @ApiProperty({ example: 'RFD-2026-00001' })
  refundNumber!: string;

  @ApiProperty()
  bookingId!: string;

  @ApiProperty()
  customerId!: string;

  @ApiProperty({ example: '90000000' })
  amountPaisa!: string;

  @ApiProperty({ example: '৳9,00,000.00' })
  amountFormatted!: string;

  @ApiProperty({ example: 'Requested' })
  status!: string;

  @ApiPropertyOptional()
  reason?: string | null;

  @ApiPropertyOptional()
  approvalId?: string | null;

  @ApiPropertyOptional()
  paidAt?: string | null;

  @ApiPropertyOptional()
  paidById?: string | null;

  @ApiPropertyOptional()
  paymentMethod?: string | null;

  @ApiPropertyOptional()
  bankAccountId?: string | null;

  @ApiPropertyOptional()
  journalId?: string | null;

  @ApiProperty()
  createdAt!: string;
}
