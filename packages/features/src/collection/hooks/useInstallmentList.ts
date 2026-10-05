import { useMemo } from 'react';
import {
  useInstallmentControllerFindByBookingId,
  useInstallmentControllerQuery,
} from '@exzaestate/api-client';
import type { PaymentTerraceItem } from '@exzaestate/ui';
import type {
  InstallmentScheduleItem,
  InstallmentStatusEnum,
  TimingAndStatusChip,
} from '../schemas/collection.schema.js';

function getPaidTimingChip(timingState?: string, daysOverdue = 0): TimingAndStatusChip {
  if (timingState === 'Paid Late' || daysOverdue > 0) {
    return { label: 'Paid · Late', variant: 'neutral' };
  }
  return { label: 'Paid · On Time', variant: 'success' };
}

function getPartialTimingChip(daysOverdue = 0): TimingAndStatusChip {
  if (daysOverdue > 0) {
    return {
      label: `Partially Paid · Overdue ${daysOverdue} ${daysOverdue === 1 ? 'day' : 'days'}`,
      variant: 'danger',
    };
  }
  return { label: 'Partially Paid · On Track', variant: 'warning' };
}

function getUnpaidTimingChip(timingState?: string, daysOverdue = 0): TimingAndStatusChip {
  if (daysOverdue > 0) {
    return {
      label: `Unpaid · Overdue ${daysOverdue} ${daysOverdue === 1 ? 'day' : 'days'}`,
      variant: 'danger',
    };
  }
  if (timingState === 'Due Today') {
    return { label: 'Due Today', variant: 'warning' };
  }
  return { label: 'Upcoming', variant: 'info' };
}

export function getCombinedTimingAndStatus(
  status: InstallmentStatusEnum,
  timingState?: string,
  daysOverdue = 0,
): TimingAndStatusChip {
  switch (status) {
    case 'PAID':
      return getPaidTimingChip(timingState, daysOverdue);
    case 'PARTIALLY_PAID':
      return getPartialTimingChip(daysOverdue);
    case 'WAIVED':
      return { label: 'Waived', variant: 'special' };
    case 'CANCELLED':
      return { label: 'Cancelled', variant: 'void' };
    default:
      return getUnpaidTimingChip(timingState, daysOverdue);
  }
}

export const getCombinedInstallmentChip = (
  status: InstallmentStatusEnum,
  daysOverdue = 0,
  timingState?: string,
): TimingAndStatusChip => getCombinedTimingAndStatus(status, timingState, daysOverdue);

interface RawInstallmentRecord {
  id?: string;
  bookingId?: string;
  installmentNumber?: number;
  name?: string;
  dueDate?: string;
  amountPaisa?: string | number | bigint;
  paidAmountPaisa?: string | number | bigint;
  paidPaisa?: string | number | bigint;
  remainingAmountPaisa?: string | number | bigint;
  remainingPaisa?: string | number | bigint;
  paymentState?: string;
  status?: string;
  overdueDays?: number;
  daysOverdue?: number;
  lateFeePaisa?: string | number | bigint;
  waivedAmountPaisa?: string | number | bigint;
}

function fallbackStr(...vals: (string | number | bigint | undefined | null)[]): string {
  for (const v of vals) {
    if (v !== undefined && v !== null && v !== '') {
      return v.toString();
    }
  }
  return '';
}

function parseInstallmentRecords(data: unknown): RawInstallmentRecord[] {
  if (!data || typeof data !== 'object') return [];
  if ('items' in data && Array.isArray((data as { items: unknown[] }).items)) {
    return (data as { items: RawInstallmentRecord[] }).items;
  }
  if (Array.isArray(data)) {
    return data as RawInstallmentRecord[];
  }
  return [];
}

function resolveInstallmentStatus(rawState?: string, rawStatus?: string): InstallmentStatusEnum {
  const norm = (rawState || rawStatus || 'UNPAID').toString().toUpperCase().replace(/\s+/g, '_');
  if (norm === 'PARTIALLY_PAID' || norm === 'PAID' || norm === 'WAIVED' || norm === 'CANCELLED') {
    return norm;
  }
  return 'UNPAID';
}

function mapInstallmentRecord(item: RawInstallmentRecord): InstallmentScheduleItem {
  const status = resolveInstallmentStatus(item.paymentState, item.status);
  const num = item.installmentNumber ?? 0;
  const days = item.overdueDays ?? item.daysOverdue ?? 0;

  return {
    id: fallbackStr(item.id, `inst-${num}`),
    bookingId: fallbackStr(item.bookingId),
    installmentNumber: num,
    name: fallbackStr(item.name, `Installment ${num}`),
    dueDate: item.dueDate ? item.dueDate.slice(0, 10) : '',
    amountPaisa: fallbackStr(item.amountPaisa, '0'),
    paidPaisa: fallbackStr(item.paidAmountPaisa, item.paidPaisa, '0'),
    remainingPaisa: fallbackStr(item.remainingAmountPaisa, item.remainingPaisa, '0'),
    status,
    daysOverdue: Number(days),
    lateFeePaisa: item.lateFeePaisa ? item.lateFeePaisa.toString() : undefined,
    waiverPaisa: item.waivedAmountPaisa ? item.waivedAmountPaisa.toString() : undefined,
  };
}

function parseInstallmentItems(rawData: unknown): InstallmentScheduleItem[] {
  const rawList = parseInstallmentRecords(rawData);
  return rawList.map(mapInstallmentRecord);
}

export function useInstallmentList(bookingId?: string) {
  const bookingQuery = useInstallmentControllerFindByBookingId(
    bookingId || '',
    { referenceDate: new Date().toISOString().slice(0, 10) },
    {
      query: {
        enabled: Boolean(bookingId),
      },
    },
  );

  const allQuery = useInstallmentControllerQuery(
    {},
    {
      query: {
        enabled: !bookingId,
      },
    },
  );

  const activeQuery = bookingId ? bookingQuery : allQuery;
  const items = useMemo(() => parseInstallmentItems(activeQuery.data), [activeQuery.data]);

  // Convert to PaymentTerrace items
  const terraceBlocks = useMemo<PaymentTerraceItem[]>(() => {
    return items.map((inst) => ({
      id: inst.id,
      label: inst.name,
      dueDate: inst.dueDate,
      amountPaisa: inst.amountPaisa,
      paidPaisa: inst.paidPaisa,
      status: inst.status,
    }));
  }, [items]);

  return {
    items,
    installments: items,
    terraceBlocks,
    isLoading: activeQuery.isLoading,
    isError: activeQuery.isError,
    refetch: activeQuery.refetch,
  };
}
