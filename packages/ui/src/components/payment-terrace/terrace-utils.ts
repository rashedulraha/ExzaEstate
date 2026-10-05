import type { PaymentTerraceItem, PaymentTerraceTotals } from './types.js';

export function toBigInt(val: bigint | string | number | undefined): bigint {
  if (typeof val === 'bigint') return val;
  if (!val) return 0n;
  try {
    const cleaned = String(val).replace(/\D/g, '');
    return cleaned ? BigInt(cleaned) : 0n;
  } catch {
    return 0n;
  }
}

export function getFillPercentage(paid: bigint, amount: bigint): number {
  if (amount <= 0n) return 0;
  return Math.min(100, Math.round((Number(paid) / Number(amount)) * 100));
}

export function checkIsOverdue(
  dueDate: string,
  today: string,
  paid: bigint,
  amount: bigint,
  status: string,
): boolean {
  if (status === 'WAIVED' || status === 'CANCELLED') return false;
  return dueDate < today && paid < amount;
}

export function getCompactBlockClass(isOverdue: boolean, status: string): string {
  if (isOverdue) return 'border-danger bg-danger/12';
  if (status === 'PAID') return 'border-success/60 bg-success/12';
  if (status === 'WAIVED') return 'border-dashed border-accent bg-accent/12';
  if (status === 'CANCELLED') return 'border-dashed border-border opacity-40 bg-surface-sunken';
  return 'border-border bg-surface-sunken';
}

export function getFullBlockClass(isOverdue: boolean, isNextDue: boolean, status: string): string {
  if (isOverdue) return 'border-danger bg-danger/12 shadow-sm';
  if (isNextDue) return 'border-info ring-2 ring-info/50 bg-info/10';
  if (status === 'PAID') return 'border-success/60 bg-success/12';
  if (status === 'WAIVED') return 'border-dashed border-accent bg-accent/12';
  if (status === 'CANCELLED') return 'border-dashed border-border opacity-40 bg-surface-sunken';
  return 'border-border bg-surface-sunken';
}

interface TerraceAccumulator {
  max: bigint;
  totalScheduled: bigint;
  totalPaid: bigint;
  totalDue: bigint;
  totalOverdue: bigint;
  foundNextDue: string | null;
}

function processTerraceItem(
  item: PaymentTerraceItem,
  acc: TerraceAccumulator,
  today: string,
): void {
  const amount = toBigInt(item.amountPaisa);
  const paid = toBigInt(item.paidPaisa);
  if (amount > acc.max) acc.max = amount;
  if (item.status === 'CANCELLED') return;

  acc.totalScheduled += amount;
  acc.totalPaid += paid;
  const remaining = amount > paid ? amount - paid : 0n;
  acc.totalDue += remaining;

  const isPast = item.dueDate < today;
  const isPayable = remaining > 0n && item.status !== 'WAIVED';

  if (isPast && isPayable) {
    acc.totalOverdue += remaining;
  } else if (!acc.foundNextDue && isPayable) {
    acc.foundNextDue = item.id;
  }
}

export function calculateTerraceTotals(
  sortedItems: PaymentTerraceItem[],
  today: string,
): { maxAmount: bigint; totals: PaymentTerraceTotals; nextDueId: string | null } {
  const acc: TerraceAccumulator = {
    max: 0n,
    totalScheduled: 0n,
    totalPaid: 0n,
    totalDue: 0n,
    totalOverdue: 0n,
    foundNextDue: null,
  };

  for (const item of sortedItems) {
    processTerraceItem(item, acc, today);
  }

  const calculatedTotals: PaymentTerraceTotals = {
    totalScheduled: acc.totalScheduled,
    totalPaid: acc.totalPaid,
    totalDue: acc.totalDue,
    totalOverdue: acc.totalOverdue,
  };

  return {
    maxAmount: acc.max > 0n ? acc.max : 1n,
    totals: calculatedTotals,
    nextDueId: acc.foundNextDue,
  };
}
