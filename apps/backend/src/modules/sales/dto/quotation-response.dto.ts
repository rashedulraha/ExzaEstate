import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class QuotationPropertySummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiPropertyOptional()
  title?: string | null;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  areaSqft!: number;

  @ApiPropertyOptional()
  facing?: string | null;

  @ApiPropertyOptional()
  projectName?: string | null;

  @ApiPropertyOptional()
  blockName?: string | null;

  @ApiPropertyOptional()
  floorName?: string | null;
}

export class QuotationPartySummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  type!: 'CUSTOMER' | 'LEAD';

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  phone?: string | null;

  @ApiPropertyOptional()
  email?: string | null;
}

export class QuotationResponseDto {
  @ApiProperty({ description: 'Quotation UUID' })
  id!: string;

  @ApiProperty({ description: 'Tenant Company UUID' })
  companyId!: string;

  @ApiPropertyOptional({ description: 'Branch UUID' })
  branchId?: string | null;

  @ApiProperty({ description: 'System-generated quotation number', example: 'QUO-2026-00001' })
  quotationNumber!: string;

  @ApiProperty({
    description: 'Current status of the quotation',
    enum: ['Draft', 'Pending Approval', 'Approved', 'Sent', 'Converted', 'Expired', 'Rejected'],
  })
  status!: string;

  @ApiProperty({ description: 'Quotation issue date' })
  quotationDate!: string;

  @ApiProperty({ description: 'Quotation validity expiry cutoff' })
  validUntil!: string;

  @ApiProperty({ description: 'Whether the quotation is currently past its validUntil date' })
  isExpired!: boolean;

  @ApiProperty({ description: 'Property summary' })
  property!: QuotationPropertySummaryDto;

  @ApiPropertyOptional({ description: 'Customer or Lead summary' })
  party?: QuotationPartySummaryDto | null;

  // Price breakdown
  @ApiProperty({ description: 'Base property price in paisa' })
  basePricePaisa!: string;

  @ApiProperty({ description: 'Formatted base property price in ৳ (lakh/crore)' })
  basePriceFormatted!: string;

  @ApiProperty({ description: 'Premium amount in paisa' })
  premiumAmountPaisa!: string;

  @ApiProperty({ description: 'Formatted premium amount in ৳' })
  premiumAmountFormatted!: string;

  @ApiProperty({ description: 'Discount amount in paisa' })
  discountAmountPaisa!: string;

  @ApiProperty({ description: 'Formatted discount amount in ৳' })
  discountAmountFormatted!: string;

  @ApiProperty({ description: 'Discount percentage on base + premium' })
  discountPct!: number;

  @ApiProperty({ description: 'Net property price in paisa (base + premium - discount)' })
  netPricePaisa!: string;

  @ApiProperty({ description: 'Formatted net property price in ৳' })
  netPriceFormatted!: string;

  // Charges & VAT totals
  @ApiProperty({ description: 'Total charges included in net price in paisa' })
  totalIncludedChargesPaisa!: string;

  @ApiProperty({ description: 'Formatted total included charges in ৳' })
  totalIncludedChargesFormatted!: string;

  @ApiProperty({ description: 'Total additional charges in paisa' })
  totalAdditionalChargesPaisa!: string;

  @ApiProperty({ description: 'Formatted total additional charges in ৳' })
  totalAdditionalChargesFormatted!: string;

  @ApiProperty({ description: 'Total VAT amount in paisa' })
  totalVatPaisa!: string;

  @ApiProperty({ description: 'Formatted total VAT in ৳' })
  totalVatFormatted!: string;

  @ApiProperty({
    description: 'Grand total payable in paisa (netPrice + additionalCharges + totalVat)',
  })
  grandTotalPaisa!: string;

  @ApiProperty({ description: 'Formatted grand total in ৳ (lakh/crore)' })
  grandTotalFormatted!: string;

  // Snapshots
  @ApiPropertyOptional({ description: 'Itemised charges snapshot array' })
  chargesSnapshot?: unknown[];

  @ApiPropertyOptional({ description: 'Calculated installment schedule snapshot' })
  installmentsSnapshot?: unknown[];

  // Approval & Conversion details
  @ApiProperty({ description: 'Whether this quotation required discount approval' })
  requiresApproval!: boolean;

  @ApiPropertyOptional({ description: 'Approval status' })
  approvalStatus?: string | null;

  @ApiPropertyOptional({ description: 'User UUID who approved the quotation' })
  approvedById?: string | null;

  @ApiPropertyOptional({ description: 'Timestamp when approved' })
  approvedAt?: string | null;

  @ApiPropertyOptional({ description: 'Rejection reason if rejected' })
  rejectionReason?: string | null;

  @ApiPropertyOptional({ description: 'Timestamp when converted to booking' })
  convertedAt?: string | null;

  @ApiPropertyOptional({ description: 'Booking UUID once converted' })
  bookingId?: string | null;

  @ApiPropertyOptional({ description: 'Internal or customer notes' })
  notes?: string | null;

  @ApiPropertyOptional({ description: 'Custom terms & conditions' })
  terms?: string | null;

  @ApiPropertyOptional({ description: 'User UUID who created this quotation' })
  createdById?: string | null;

  @ApiPropertyOptional({ description: 'User UUID who updated this quotation' })
  updatedById?: string | null;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: string;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: string;
}

export class QuotationListResponseDto {
  @ApiProperty({ type: [QuotationResponseDto] })
  items!: QuotationResponseDto[];

  @ApiProperty({ description: 'Total matching records' })
  total!: number;

  @ApiProperty({ description: 'Current page number' })
  page!: number;

  @ApiProperty({ description: 'Items per page' })
  limit!: number;
}
