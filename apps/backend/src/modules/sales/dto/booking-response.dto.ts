import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BookingCustomerResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  customerId!: string;

  @ApiProperty()
  sharePercentage!: number;

  @ApiProperty()
  isPrimary!: boolean;
}

export class BookingChargeResponseDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  chargeTypeId!: string | null;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  calculationType!: string;

  @ApiPropertyOptional()
  rate!: number | null;

  @ApiProperty()
  amountPaisa!: string;

  @ApiProperty()
  vatRate!: number;

  @ApiProperty()
  vatAmountPaisa!: string;

  @ApiProperty()
  totalAmountPaisa!: string;

  @ApiProperty()
  isIncludedInNet!: boolean;

  @ApiProperty()
  payableStage!: string;

  @ApiProperty()
  paidAmountPaisa!: string;
}

export class BookingResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  bookingNumber!: string;

  @ApiProperty()
  propertyId!: string;

  @ApiProperty()
  customerId!: string;

  @ApiPropertyOptional()
  leadId!: string | null;

  @ApiPropertyOptional()
  quotationId!: string | null;

  @ApiProperty()
  salesExecutiveId!: string;

  @ApiPropertyOptional()
  brokerId!: string | null;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  basePricePaisa!: string;

  @ApiProperty()
  totalPricePaisa!: string;

  @ApiProperty()
  discountAmountPaisa!: string;

  @ApiPropertyOptional()
  discountPercentage!: number | null;

  @ApiProperty()
  netPricePaisa!: string;

  @ApiProperty()
  bookingAmountPaisa!: string;

  @ApiProperty()
  downPaymentPaisa!: string;

  @ApiProperty()
  totalPaidPaisa!: string;

  @ApiPropertyOptional()
  approvalId!: string | null;

  @ApiPropertyOptional()
  approvalStatus!: string | null;

  @ApiPropertyOptional()
  paymentPlanTemplateId!: string | null;

  @ApiProperty()
  bookingDate!: string;

  @ApiProperty()
  reservationHoldHours!: number;

  @ApiPropertyOptional()
  reservationExpiresAt!: string | null;

  @ApiPropertyOptional()
  confirmedAt!: string | null;

  @ApiPropertyOptional()
  cancelledAt!: string | null;

  @ApiPropertyOptional()
  cancellationReason!: string | null;

  @ApiProperty()
  isLegacy!: boolean;

  @ApiProperty()
  isTransfer!: boolean;

  @ApiPropertyOptional()
  notes!: string | null;

  @ApiPropertyOptional()
  terms!: string | null;

  @ApiProperty({ type: [BookingCustomerResponseDto] })
  customers!: BookingCustomerResponseDto[];

  @ApiProperty({ type: [BookingChargeResponseDto] })
  charges!: BookingChargeResponseDto[];

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
