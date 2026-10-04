import { formatMoney } from '@exzaestate/shared';
import type { Installment } from '@prisma/client';
import {
  deriveInstallmentStatus,
  type InstallmentDerivedStatus,
} from './domain/installment-state.js';
import type { InstallmentResponseDto } from './dto/installment-response.dto.js';

function formatDueDate(d: Date | string): string {
  if (d instanceof Date) {
    return d.toISOString().slice(0, 10);
  }
  return String(d).slice(0, 10);
}

function formatDateOrNow(d: Date | null | undefined): string {
  return d ? d.toISOString() : new Date().toISOString();
}

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

  return {
    id: record.id,
    companyId: record.companyId,
    bookingId: record.bookingId,
    installmentNumber: record.installmentNumber,
    name: record.name,
    type: record.type,
    dueDate: formatDueDate(record.dueDate),
    amountPaisa: record.amountPaisa.toString(),
    amountFormatted: formatMoney(record.amountPaisa),
    paidAmountPaisa: record.paidAmountPaisa.toString(),
    paidAmountFormatted: formatMoney(record.paidAmountPaisa),
    remainingAmountPaisa: derived.remainingAmountPaisa.toString(),
    remainingAmountFormatted: formatMoney(derived.remainingAmountPaisa),
    waivedAmountPaisa: (record.waivedAmountPaisa ?? 0n).toString(),
    lateFeePaisa: (record.lateFeePaisa ?? 0n).toString(),
    paymentState: derived.paymentState,
    timingState: derived.timingState,
    overdueDays: derived.overdueDays,
    statusLabel: derived.label,
    milestoneEvent: record.milestoneEvent ?? null,
    milestoneCompleted: record.milestoneCompleted ?? false,
    milestoneCompletedAt: record.milestoneCompletedAt?.toISOString() ?? null,
    notes: record.notes ?? null,
    createdAt: formatDateOrNow(record.createdAt),
    updatedAt: formatDateOrNow(record.updatedAt),
  };
}
