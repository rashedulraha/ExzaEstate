import { formatMoney } from '@exzaestate/shared';
import type { GeneratedScheduleResult } from '../domain/installment-schedule-engine.js';
import type { PaymentPlanTemplateResponseDto, SchedulePreviewResponseDto } from '../dto/index.js';

interface RawTemplateRecord {
  id: string;
  companyId: string;
  code: string;
  name: string;
  description: string | null;
  planType: string;
  frequency: string;
  installmentCount: number;
  minBookingPct: { toString(): string } | number;
  downPaymentPct: { toString(): string } | number;
  milestoneConfig: unknown;
  isActive: boolean;
  isDefault: boolean;
  createdById: string | null;
  updatedById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function mapTemplateToDto(record: RawTemplateRecord): PaymentPlanTemplateResponseDto {
  return {
    id: record.id,
    companyId: record.companyId,
    code: record.code,
    name: record.name,
    description: record.description,
    planType: record.planType,
    frequency: record.frequency,
    installmentCount: record.installmentCount,
    minBookingPct: Number(record.minBookingPct),
    downPaymentPct: Number(record.downPaymentPct),
    milestoneConfig: record.milestoneConfig,
    isActive: record.isActive,
    isDefault: record.isDefault,
    createdById: record.createdById,
    updatedById: record.updatedById,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function mapScheduleToResponseDto(
  schedule: GeneratedScheduleResult,
): SchedulePreviewResponseDto {
  return {
    netPricePaisa: schedule.netPricePaisa.toString(),
    netPriceFormatted: formatMoney(schedule.netPricePaisa),
    bookingAmountPaisa: schedule.bookingAmountPaisa.toString(),
    bookingAmountFormatted: formatMoney(schedule.bookingAmountPaisa),
    downPaymentPaisa: schedule.downPaymentPaisa.toString(),
    downPaymentFormatted: formatMoney(schedule.downPaymentPaisa),
    remainingPaisa: schedule.remainingPaisa.toString(),
    remainingFormatted: formatMoney(schedule.remainingPaisa),
    installmentCount: schedule.installmentCount,
    frequency: schedule.frequency,
    items: schedule.items.map((it) => ({
      installmentNumber: it.installmentNumber,
      name: it.name,
      type: it.type,
      amountPaisa: it.amountPaisa.toString(),
      amountFormatted: it.amountFormatted,
      dueDate: it.dueDate,
    })),
    totalScheduledPaisa: schedule.totalScheduledPaisa.toString(),
  };
}
