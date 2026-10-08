import { Injectable } from '@nestjs/common';
import { differenceInCalendarDays } from 'date-fns';
import { TenantDb } from '../../../database/tenant-db.service.js';
import { OutboxService } from '../../../platform/outbox/outbox.service.js';
import {
  computeTimingState,
  getCombinedStatusLabel,
  type InstallmentPaymentState,
} from '../installment/domain/installment-state.js';

export const DEFAULT_REMINDER_OFFSETS = [-7, -3, 0, 3, 7, 30] as const;

export interface OverdueCalculationResult {
  scannedCount: number;
  overdueCount: number;
  remindersTriggered: number;
}

@Injectable()
export class OverdueCalculationService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly outboxService: OutboxService,
  ) {}

  async runOverdueCalculation(
    companyId: string,
    referenceDate?: Date | string,
  ): Promise<OverdueCalculationResult> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const ref = referenceDate ? new Date(referenceDate) : new Date();

      const installments = await tx.installment.findMany({
        where: {
          companyId,
          paymentState: { in: ['Unpaid', 'Partially Paid'] },
          remainingAmountPaisa: { gt: 0n },
          booking: {
            status: { notIn: ['Cancelled', 'Rejected'] },
          },
        },
        include: {
          booking: true,
        },
      });

      let overdueCount = 0;
      let remindersTriggered = 0;

      for (const inst of installments) {
        const paymentState = inst.paymentState as InstallmentPaymentState;
        const { timingState, overdueDays } = computeTimingState({
          dueDate: inst.dueDate,
          paymentState,
          referenceDate: ref,
        });

        if (timingState === 'Overdue') {
          overdueCount++;
        }

        // Calculate offset from due date
        // ref > due -> positive (overdue); ref < due -> negative (upcoming)
        const offset = differenceInCalendarDays(ref, inst.dueDate);

        if ((DEFAULT_REMINDER_OFFSETS as readonly number[]).includes(offset)) {
          remindersTriggered++;
          const label = getCombinedStatusLabel(paymentState, timingState, overdueDays);

          await this.outboxService.emit(tx, 'collection.reminder_due', {
            companyId,
            installmentId: inst.id,
            bookingId: inst.bookingId,
            customerId: inst.booking.customerId,
            daysOffset: offset,
            statusLabel: label,
            remainingAmountPaisa: inst.remainingAmountPaisa.toString(),
            dueDate: inst.dueDate.toISOString(),
          });
        }
      }

      return {
        scannedCount: installments.length,
        overdueCount,
        remindersTriggered,
      };
    });
  }
}
