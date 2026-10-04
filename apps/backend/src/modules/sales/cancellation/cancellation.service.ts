import { Injectable, NotFoundException } from '@nestjs/common';
import { DOMAIN_EVENTS, ERROR_CODES, formatMoney } from '@exzaestate/shared';
import { TenantDb } from '../../../database/tenant-db.service.js';
import { AuditService } from '../../../platform/audit/audit.service.js';
import { OutboxService } from '../../../platform/outbox/outbox.service.js';
import { PostingService } from '../../accounting/posting/posting.service.js';
import { RefundService } from '../../collection/refund/refund.service.js';
import {
  CancellationPreviewDto,
  CancellationResultDto,
  RequestCancellationDto,
} from './dto/cancellation.dto.js';
import {
  assertBookingCancellable,
  computeCancellationAmounts,
} from './cancellation.helper.js';

@Injectable()
export class CancellationService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly auditService: AuditService,
    private readonly outboxService: OutboxService,
    private readonly postingService: PostingService,
    private readonly refundService: RefundService,
  ) {}

  async previewCancellation(
    companyId: string,
    bookingId: string,
    dto?: { deductionRatePct?: number; deductionPaisa?: string },
  ): Promise<CancellationPreviewDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id: bookingId, companyId },
      });

      if (!booking) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: `Booking with ID "${bookingId}" not found`,
        });
      }

      const payments = await tx.payment.findMany({
        where: { companyId, bookingId, status: 'Posted' },
        select: { amountPaisa: true },
      });

      let paidAmountPaisa = 0n;
      for (const p of payments) {
        paidAmountPaisa += p.amountPaisa;
      }

      const ratePct = dto?.deductionRatePct ?? 10;
      let deductionPaisa: bigint;

      if (dto?.deductionPaisa !== undefined) {
        deductionPaisa = BigInt(dto.deductionPaisa);
      } else {
        deductionPaisa = (paidAmountPaisa * BigInt(ratePct)) / 100n;
      }

      if (deductionPaisa > paidAmountPaisa) {
        deductionPaisa = paidAmountPaisa;
      }

      const refundPaisa = paidAmountPaisa - deductionPaisa;

      return {
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        netPricePaisa: booking.netPricePaisa.toString(),
        paidAmountPaisa: paidAmountPaisa.toString(),
        deductionRatePct: ratePct,
        deductionPaisa: deductionPaisa.toString(),
        refundPaisa: refundPaisa.toString(),
        formattedPaidAmount: formatMoney(paidAmountPaisa),
        formattedDeduction: formatMoney(deductionPaisa),
        formattedRefund: formatMoney(refundPaisa),
      };
    });
  }

  async cancelBooking(
    companyId: string,
    userId: string,
    bookingId: string,
    dto: RequestCancellationDto,
  ): Promise<CancellationResultDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id: bookingId, companyId },
      });

      assertBookingCancellable(booking, bookingId);

      const property = await tx.property.findFirst({
        where: { id: booking.propertyId, companyId },
      });

      // 1. Calculate paid amount from posted payments
      const payments = await tx.payment.findMany({
        where: { companyId, bookingId, status: 'Posted' },
        select: { amountPaisa: true },
      });

      const paidAmountPaisa = payments.reduce((acc, p) => acc + p.amountPaisa, 0n);

      // 2. Calculate deduction and refund
      const { deductionPaisa, refundPaisa } = computeCancellationAmounts(dto, paidAmountPaisa);

      // 3. Update booking status
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancellationReason: dto.reason,
          cancellationDeductionPaisa: deductionPaisa,
        },
      });

      // 4. Cancel unpaid or partially paid installments
      await tx.installment.updateMany({
        where: {
          companyId,
          bookingId: booking.id,
          paymentState: { in: ['Unpaid', 'Partially Paid'] },
        },
        data: { paymentState: 'Cancelled' },
      });

      // 5. Update property status per cancellation policy
      const propStatus = dto.propertyStatus ?? 'AVAILABLE';
      await tx.property.update({
        where: { id: booking.propertyId },
        data: { status: propStatus },
      });

      // 6. Post BOOKING_CANCELLED accounting event (both journal 1 & journal 2)
      const journals = await this.postingService.post(
        companyId,
        userId,
        'BOOKING_CANCELLED',
        {
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
          customerId: booking.customerId,
          projectId: property?.projectId ?? undefined,
          netPricePaisa: booking.netPricePaisa.toString(),
          vatPaisa: '0',
          paidAmountPaisa: paidAmountPaisa.toString(),
          deductionPaisa: deductionPaisa.toString(),
          refundPaisa: refundPaisa.toString(),
          postingDate: new Date().toISOString(),
        },
        tx,
      );


      // 7. Create Refund record if refundPaisa > 0
      let refundId: string | undefined;
      let refundNumber: string | undefined;

      if (refundPaisa > 0n) {
        const refund = await this.refundService.createRefund(tx, {
          companyId,
          bookingId: booking.id,
          customerId: booking.customerId,
          amountPaisa: refundPaisa,
          reason: dto.reason,
          createdById: userId,
        });
        refundId = refund.id;
        refundNumber = refund.refundNumber;
      }

      // 8. Audit record
      await this.auditService.record(tx, {
        action: 'BOOKING_CANCELLED',
        module: 'sales',
        recordType: 'Booking',
        recordId: booking.id,
        before: { status: booking.status },
        after: {
          status: 'CANCELLED',
          paidAmountPaisa: paidAmountPaisa.toString(),
          deductionPaisa: deductionPaisa.toString(),
          refundPaisa: refundPaisa.toString(),
          refundNumber,
          propertyStatus: propStatus,
        },
      });

      // 9. Outbox events
      await this.outboxService.emit(tx, DOMAIN_EVENTS.BOOKING_CANCELLED, {
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        customerId: booking.customerId,
        status: 'CANCELLED',
        cancellationReason: dto.reason,
        refundId,
        refundPaisa: refundPaisa.toString(),
      });

      // Emit commission clawback event (consumed in Phase A8.3)
      await this.outboxService.emit(tx, 'commission.clawback_pending', {
        bookingId: booking.id,
        companyId,
        customerId: booking.customerId,
      });

      return {
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        status: 'CANCELLED',
        paidAmountPaisa: paidAmountPaisa.toString(),
        deductionPaisa: deductionPaisa.toString(),
        refundPaisa: refundPaisa.toString(),
        refundId,
        refundNumber,
        journalIds: journals.map((j) => j.id),
      };
    });
  }
}
