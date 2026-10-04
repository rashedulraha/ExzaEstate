import type { Booking, BookingCharge, BookingCustomer } from '@prisma/client';
import type { BookingResponseDto } from '../dto/index.js';

export type BookingWithRelations = Booking & {
  customers?: BookingCustomer[];
  charges?: BookingCharge[];
};

export function mapBookingToDto(booking: BookingWithRelations): BookingResponseDto {
  return {
    id: booking.id,
    companyId: booking.companyId,
    bookingNumber: booking.bookingNumber,
    propertyId: booking.propertyId,
    customerId: booking.customerId,
    leadId: booking.leadId,
    quotationId: booking.quotationId,
    salesExecutiveId: booking.salesExecutiveId,
    brokerId: booking.brokerId,
    status: booking.status,
    basePricePaisa: booking.basePricePaisa.toString(),
    totalPricePaisa: booking.totalPricePaisa.toString(),
    discountAmountPaisa: booking.discountAmountPaisa.toString(),
    discountPercentage: booking.discountPercentage ? Number(booking.discountPercentage) : null,
    netPricePaisa: booking.netPricePaisa.toString(),
    bookingAmountPaisa: booking.bookingAmountPaisa.toString(),
    downPaymentPaisa: booking.downPaymentPaisa.toString(),
    totalPaidPaisa: booking.totalPaidPaisa.toString(),
    approvalId: booking.approvalId,
    approvalStatus: booking.approvalStatus,
    paymentPlanTemplateId: booking.paymentPlanTemplateId,
    bookingDate: booking.bookingDate.toISOString(),
    reservationHoldHours: booking.reservationHoldHours,
    reservationExpiresAt: booking.reservationExpiresAt
      ? booking.reservationExpiresAt.toISOString()
      : null,
    confirmedAt: booking.confirmedAt ? booking.confirmedAt.toISOString() : null,
    cancelledAt: booking.cancelledAt ? booking.cancelledAt.toISOString() : null,
    cancellationReason: booking.cancellationReason,
    isLegacy: booking.isLegacy,
    isTransfer: booking.isTransfer,
    notes: booking.notes,
    terms: booking.terms,
    customers: (booking.customers || []).map((c) => ({
      id: c.id,
      customerId: c.customerId,
      sharePercentage: Number(c.sharePercentage),
      isPrimary: c.isPrimary,
    })),
    charges: (booking.charges || []).map((ch) => ({
      id: ch.id,
      chargeTypeId: ch.chargeTypeId,
      name: ch.name,
      calculationType: ch.calculationType,
      rate: ch.rate ? Number(ch.rate) : null,
      amountPaisa: ch.amountPaisa.toString(),
      vatRate: Number(ch.vatRate),
      vatAmountPaisa: ch.vatAmountPaisa.toString(),
      totalAmountPaisa: ch.totalAmountPaisa.toString(),
      isIncludedInNet: ch.isIncludedInNet,
      payableStage: ch.payableStage,
      paidAmountPaisa: ch.paidAmountPaisa.toString(),
    })),
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
  };
}
