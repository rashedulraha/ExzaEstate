import type { AccountingPeriod, FiscalYear } from '@prisma/client';
import type {
  AccountingPeriodResponseDto,
  FiscalYearResponseDto,
} from './dto/period-response.dto.js';

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function mapPeriodToDto(period: AccountingPeriod): AccountingPeriodResponseDto {
  return {
    id: period.id,
    fiscalYearId: period.fiscalYearId,
    periodNumber: period.periodNumber,
    name: period.name,
    startDate: formatDateOnly(period.startDate),
    endDate: formatDateOnly(period.endDate),
    status: period.status,
    closedAt: period.closedAt,
    closedById: period.closedById,
    reopenedAt: period.reopenedAt,
    reopenedById: period.reopenedById,
    reopenReason: period.reopenReason,
    createdAt: period.createdAt,
    updatedAt: period.updatedAt,
  };
}

export function mapFiscalYearToDto(
  fy: FiscalYear & { periods?: AccountingPeriod[] },
): FiscalYearResponseDto {
  return {
    id: fy.id,
    name: fy.name,
    startDate: formatDateOnly(fy.startDate),
    endDate: formatDateOnly(fy.endDate),
    isClosed: fy.isClosed,
    periods: fy.periods ? fy.periods.map(mapPeriodToDto) : undefined,
    createdAt: fy.createdAt,
    updatedAt: fy.updatedAt,
  };
}
