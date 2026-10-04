import { Injectable, Logger } from '@nestjs/common';
import {
  BOOKING_STATUSES,
  DOMAIN_EVENTS,
  PROPERTY_STATUSES,
} from '@exzaestate/shared';
import type { TenantPrisma } from '../../../database/tenant-prisma.js';
import { AuditService } from '../../../platform/audit/audit.service.js';
import { OutboxService } from '../../../platform/outbox/outbox.service.js';
import { PostingService } from '../../accounting/posting/posting.service.js';
import type {
  PaymentPostedEvent,
  PaymentPostedHook,
} from '../../collection/payment/payment-posted.hook.js';
import { generateInstallmentItems } from '../../collection/installment/domain/schedule-generator.js';

@Injectable()
export class BookingConfirmationPaymentHook implements PaymentPostedHook {
  readonly hookName = 'BookingConfirmationPaymentHook';
  private readonly logger = new Logger(BookingConfirmationPaymentHook.name);

  constructor(
    private readonly auditService: AuditService,
    private readonly outboxService: OutboxService,
    private readonly postingService: PostingService,
  ) {}

  async onPaymentPosted(tx: TenantPrisma, event: PaymentPostedEvent): Promise<void> {
    if (!event.bookingId) {
      return;
    }

    const booking = await tx.booking.findFirst({
      where: {
        id: event.bookingId,
        companyId: event.companyId,
        deletedAt: null,
      },
    });

    if (!booking) {
      return;
    }

    const property = await tx.property.findFirst({
      where: { id: booking.propertyId, companyId: event.companyId },
    });

    // Only confirm bookings that are currently in REQUESTED state
    if (booking.status !== BOOKING_STATUSES.REQUESTED) {
      return;
    }

    // If discount approval is still pending, do not confirm
    if (booking.approvalStatus && booking.approvalStatus !== 'APPROVED') {
      return;
    }


    // Sum all posted payments for this booking
    const paymentsAggregate = await tx.payment.aggregate({
      _sum: { amountPaisa: true },
      where: {
        bookingId: booking.id,
        companyId: event.companyId,
        status: 'Posted',
      },
    });

    const totalPostedPaisa = paymentsAggregate._sum.amountPaisa ?? 0n;

    // Minimum required booking amount:
    // Either booking.bookingAmountPaisa, or 10% of net price (BR-18, AT-12)
    const minBookingPaisa =
      booking.bookingAmountPaisa > 0n
        ? booking.bookingAmountPaisa
        : (booking.netPricePaisa * 10n) / 100n;

    if (totalPostedPaisa < minBookingPaisa) {
      this.logger.log(
        `Booking ${booking.bookingNumber} total posted ${totalPostedPaisa} < required ${minBookingPaisa}; keeping REQUESTED`,
      );
      return;
    }

    // Confirmation threshold satisfied! Proceed with atomic confirmation in this same transaction tx.
    this.logger.log(
      `Confirming booking ${booking.bookingNumber}: total posted ${totalPostedPaisa} >= min ${minBookingPaisa}`,
    );

    await this.executeConfirmation(tx, booking, property, event);
  }

  private async executeConfirmation(
    tx: TenantPrisma,
    booking: {
      id: string;
      bookingNumber: string;
      customerId: string;
      propertyId: string;
      status: string;
      netPricePaisa: bigint;
      basePricePaisa: bigint;
      discountAmountPaisa: bigint;
      bookingAmountPaisa: bigint;
      downPaymentPaisa: bigint;
    },
    property: { status: string; projectId?: string | null } | null,
    event: PaymentPostedEvent,
  ): Promise<void> {
    const now = new Date();

    // 1. Update booking & property status
    await tx.booking.update({
      where: { id: booking.id },
      data: { status: BOOKING_STATUSES.CONFIRMED, confirmedAt: now },
    });

    await tx.property.update({
      where: { id: booking.propertyId },
      data: { status: PROPERTY_STATUSES.BOOKED },
    });

    await tx.propertyStatusHistory.create({
      data: {
        companyId: event.companyId,
        propertyId: booking.propertyId,
        fromStatus: property?.status ?? PROPERTY_STATUSES.AVAILABLE,
        toStatus: PROPERTY_STATUSES.BOOKED,
        reason: `Booking confirmed with booking money payment ${event.paymentId}`,
        changedById: event.postedById,
      },
    });

    await tx.bookingStatusHistory.create({
      data: {
        companyId: event.companyId,
        bookingId: booking.id,
        fromStatus: booking.status,
        toStatus: BOOKING_STATUSES.CONFIRMED,
        reason: `Booking confirmed upon receiving minimum booking amount`,
        changedById: event.postedById,
      },
    });

    // 2. Ensure installment schedule exists
    await this.ensureInstallmentSchedule(tx, booking, event);

    // 3. Post BOOKING_CONFIRMED receivable journal entry
    await this.postingService.post(
      event.companyId,
      event.postedById,
      'BOOKING_CONFIRMED',
      {
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        customerId: booking.customerId,
        projectId: property?.projectId ?? undefined,
        netPricePaisa: booking.netPricePaisa.toString(),
        listPricePaisa: booking.basePricePaisa.toString(),
        discountPaisa: booking.discountAmountPaisa.toString(),
        vatPaisa: '0',
        postingDate: now,
        reference: `Confirmation of Booking ${booking.bookingNumber}`,
      },
      tx,
    );

    // 4. Audit log
    await this.auditService.record(tx, {
      action: 'BOOKING_CONFIRMED',
      module: 'sales',
      recordType: 'Booking',
      recordId: booking.id,
      before: { status: booking.status },
      after: {
        status: BOOKING_STATUSES.CONFIRMED,
        confirmedAt: now.toISOString(),
      },
    });

    // 5. Outbox domain event
    await this.outboxService.emit(tx, DOMAIN_EVENTS.BOOKING_CONFIRMED, {
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      companyId: event.companyId,
      customerId: booking.customerId,
      propertyId: booking.propertyId,
      netPricePaisa: booking.netPricePaisa.toString(),
    });
  }

  private async ensureInstallmentSchedule(
    tx: TenantPrisma,
    booking: {
      id: string;
      netPricePaisa: bigint;
      bookingAmountPaisa: bigint;
      downPaymentPaisa: bigint;
    },
    event: PaymentPostedEvent,
  ): Promise<void> {
    const count = await tx.installment.count({
      where: { companyId: event.companyId, bookingId: booking.id },
    });
    if (count > 0) return;

    const firstDueDate = new Date();
    firstDueDate.setMonth(firstDueDate.getMonth() + 1);
    const firstDueDateStr = firstDueDate.toISOString().slice(0, 10);

    const items = generateInstallmentItems({
      netPricePaisa: booking.netPricePaisa,
      bookingAmountPaisa: booking.bookingAmountPaisa,
      downPaymentPaisa: booking.downPaymentPaisa,
      installmentCount: 24,
      firstDueDate: firstDueDateStr,
      frequency: 'MONTHLY',
    });

    for (const item of items) {
      await tx.installment.create({
        data: {
          companyId: event.companyId,
          bookingId: booking.id,
          installmentNumber: item.installmentNumber,
          name: item.name,
          type: item.type,
          dueDate: new Date(item.dueDate),
          amountPaisa: item.amountPaisa,
          paidAmountPaisa: 0n,
          remainingAmountPaisa: item.amountPaisa,
          paymentState: 'Unpaid',
          createdById: event.postedById,
        },
      });
    }
  }
}
