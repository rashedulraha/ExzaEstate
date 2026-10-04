import { differenceInCalendarDays } from 'date-fns';

export interface LateFeeCalculationParams {
  overduePrincipalPaisa: bigint;
  dueDate: Date | string;
  asOfDate: Date | string;
  lateFeeRatePct: number; // e.g. 2 for 2% per month
  graceDays?: number; // e.g. 7 days
}

export interface LateFeeCalculationResult {
  overdueDays: number;
  isEligible: boolean;
  lateFeePaisa: bigint;
}

/**
 * Pure domain function to calculate simple monthly late fee on overdue principal after grace period.
 * When lateFeeRatePct <= 0, returns 0n.
 */
export function calculateLateFee(params: LateFeeCalculationParams): LateFeeCalculationResult {
  const { overduePrincipalPaisa, lateFeeRatePct, graceDays = 7 } = params;

  if (lateFeeRatePct <= 0 || overduePrincipalPaisa <= 0n) {
    return {
      overdueDays: 0,
      isEligible: false,
      lateFeePaisa: 0n,
    };
  }

  const due = typeof params.dueDate === 'string' ? new Date(params.dueDate) : params.dueDate;
  const asOf = typeof params.asOfDate === 'string' ? new Date(params.asOfDate) : params.asOfDate;

  const overdueDays = differenceInCalendarDays(asOf, due);

  if (overdueDays <= graceDays) {
    return {
      overdueDays: Math.max(0, overdueDays),
      isEligible: false,
      lateFeePaisa: 0n,
    };
  }

  // Monthly simple fee after grace: at least 1 month
  const monthsOverdue = Math.max(1, Math.ceil((overdueDays - graceDays) / 30));
  // Basis points calculation: ratePct * 100 (e.g. 2% = 200 bps)
  const rateBps = BigInt(Math.round(lateFeeRatePct * 100));
  const feePaisa = (overduePrincipalPaisa * rateBps * BigInt(monthsOverdue)) / 10000n;

  return {
    overdueDays,
    isEligible: true,
    lateFeePaisa: feePaisa,
  };
}
