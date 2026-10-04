import { formatMoney } from '@exzaestate/shared';
import type { Installment } from '@prisma/client';
import {
  deriveInstallmentStatus,
  type InstallmentDerivedStatus,
} from './domain/installment-state.js';
import type { InstallmentResponseDto } from './dto/installment-response.dto.js';

export function toInstallmentResponseDto(
  record: Installment,
  companyTimezone = 'Asia/Dhaka',
  referenceDate?: string,
): InstallmentResponseDto {
  const derived: InstallmentDerivedStatus = deriveInstallmentStatus({
    amountPaisa: record.amountPaisa,
    paidAmountPaisa: record.paidAmountPaisa,
    waivedAmountPaisa: record.waivedAmountPaisa,
    dueDate: record.dueDate,
    companyTimezone,
    referenceDate,
  });

  const dueDateStr =
    record.dueDate instanceof Date
      ? record.dueDate.toISOString().slice(0, 10)
      : String(record.dueDate).slice(0, 10);

  return {
    id: record.id,
    companyId: record.companyId,
    bookingId: record.bookingId,
    installmentNumber: record.installmentNumber,
    name: record.name,
    type: record.type,
    dueDate: dueDateStr,
    amountPaisa: record.amountPaisa.toString(),
    amountFormatted: formatMoney(record.amountPaisa),
    paidAmountPaisa: record.paidAmountPaisa.toString(),
    paidAmountFormatted: formatMoney(record.paidAmountPaisa),
    remainingAmountPaisa: derived.remainingAmountPaisa.toString(),
    remainingAmountFormatted: formatMoney(derived.remainingAmountPaisa),
    waivedAmountPaisa: record.waivedAmountPaisa.toString(),
    lateFeePaisa: record.lateFeePaisa.toString(),
    paymentState: derived.paymentState,
    timingState: derived.timingState,
    overdueDays: derived.overdueDays,
    statusLabel: derived.label,
    milestoneEvent: record.milestoneEvent,
    milestoneCompleted: record.milestoneCompleted,
    milestoneCompletedAt: record.milestoneCompletedAt
      ? record.milestoneCompletedAt.toISOString()
      : null,
    notes: record.notes,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
