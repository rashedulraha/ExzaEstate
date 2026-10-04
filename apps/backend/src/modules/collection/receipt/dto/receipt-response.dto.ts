import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReceiptResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: string;

  @ApiProperty({ example: 'REC-2026-00001' })
  receiptNumber!: string;

  @ApiProperty()
  paymentId!: string;

  @ApiPropertyOptional()
  bookingId?: string | null;

  @ApiProperty()
  customerId!: string;

  @ApiPropertyOptional()
  propertyId?: string | null;

  @ApiPropertyOptional()
  projectId?: string | null;

  @ApiProperty({ example: '50000000', description: 'BigInt paisa as string' })
  amountPaisa!: string;

  @ApiProperty({ example: '৳5,00,000.00' })
  amountFormatted!: string;

  @ApiProperty({ example: 'Five Lakh Taka Only' })
  amountInWords!: string;

  @ApiProperty({ example: '500000000' })
  previousDuePaisa!: string;

  @ApiProperty({ example: '৳50,00,000.00' })
  previousDueFormatted!: string;

  @ApiProperty({ example: '450000000' })
  currentDuePaisa!: string;

  @ApiProperty({ example: '৳45,00,000.00' })
  currentDueFormatted!: string;

  @ApiProperty({ example: 'BANK_TRANSFER' })
  paymentMethod!: string;

  @ApiProperty({ example: false })
  isVoid!: boolean;

  @ApiPropertyOptional()
  voidReason?: string | null;

  @ApiPropertyOptional()
  voidedAt?: string | null;

  @ApiPropertyOptional()
  voidedById?: string | null;

  @ApiProperty({ example: 0 })
  reprintCount!: number;

  @ApiPropertyOptional({ example: 'DUPLICATE COPY' })
  watermark?: string | null;

  @ApiProperty()
  issuedAt!: string;

  @ApiProperty()
  issuedById!: string;

  @ApiProperty()
  createdAt!: string;
}

export class QueryReceiptsDto {
  @ApiPropertyOptional()
  bookingId?: string;

  @ApiPropertyOptional()
  customerId?: string;

  @ApiPropertyOptional()
  isVoid?: boolean;

  @ApiPropertyOptional()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  limit?: number;
}
