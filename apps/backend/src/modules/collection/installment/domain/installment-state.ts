export type {
  InstallmentPaymentState,
  InstallmentTimingState,
} from '@exzaestate/shared';
import {
  INSTALLMENT_PAYMENT_STATES,
  INSTALLMENT_TIMING_STATES,
  type InstallmentPaymentState,
  type InstallmentTimingState,
  getTodayBusinessDate,
} from '@exzaestate/shared';
import { differenceInCalendarDays } from 'date-fns';
import { TZDate } from '@date-fns/tz';

export interface InstallmentBalanceInput {
  amountPaisa: bigint;
  paidAmountPaisa?: bigint;
  waivedAmountPaisa?: bigint;
  isCancelled?: boolean;
}

export interface InstallmentTimingInput {
  dueDate: Date | string;
  paymentState: InstallmentPaymentState;
  companyTimezone?: string;
  referenceDate?: Date | string;
}

export interface InstallmentDerivedStatus {
  paymentState: InstallmentPaymentState;
  timingState: InstallmentTimingState | null;
  overdueDays: number;
  label: string;
  remainingAmountPaisa: bigint;
}

/**
 * Computes remaining balance in paisa: max(0, amount - paid - waived)
 */
export function computeRemainingAmountPaisa(
  amountPaisa: bigint,
  paidAmountPaisa: bigint = 0n,
  waivedAmountPaisa: bigint = 0n,
): bigint {
  const settled = paidAmountPaisa + waivedAmountPaisa;
  const remaining = amountPaisa - settled;
  return remaining > 0n ? remaining : 0n;
}

/**
 * Computes the payment state of an installment based on paid and waived amounts.
 */
export function computePaymentState(input: InstallmentBalanceInput): InstallmentPaymentState {
  if (input.isCancelled) {
    return INSTALLMENT_PAYMENT_STATES.CANCELLED;
  }

  const amount = input.amountPaisa;
  const paid = input.paidAmountPaisa ?? 0n;
  const waived = input.waivedAmountPaisa ?? 0n;

  if (amount <= 0n) {
    return INSTALLMENT_PAYMENT_STATES.PAID;
  }

  if (waived >= amount && paid === 0n) {
    return INSTALLMENT_PAYMENT_STATES.WAIVED;
  }

  if (paid + waived >= amount) {
    return INSTALLMENT_PAYMENT_STATES.PAID;
  }

  if (paid > 0n || waived > 0n) {
    return INSTALLMENT_PAYMENT_STATES.PARTIALLY_PAID;
  }

  return INSTALLMENT_PAYMENT_STATES.UNPAID;
}

function resolveReferenceDateStr(referenceDate?: Date | string, timezone = 'Asia/Dhaka'): string {
  if (!referenceDate) {
    return getTodayBusinessDate(timezone);
  }
  if (typeof referenceDate === 'string') {
    return referenceDate.slice(0, 10);
  }
  return new TZDate(referenceDate, timezone).toISOString().slice(0, 10);
}

/**
 * Derives the timing state (Upcoming, Due Today, Overdue) vs Asia/Dhaka today.
 * Terminal states (Paid, Waived, Cancelled) return null timing state per PRD §9.3.
 */
export function computeTimingState(input: InstallmentTimingInput): {
  timingState: InstallmentTimingState | null;
  overdueDays: number;
} {
  const isTerminal =
    input.paymentState === INSTALLMENT_PAYMENT_STATES.PAID ||
    input.paymentState === INSTALLMENT_PAYMENT_STATES.WAIVED ||
    input.paymentState === INSTALLMENT_PAYMENT_STATES.CANCELLED;

  if (isTerminal) {
    return { timingState: null, overdueDays: 0 };
  }

  const timezone = input.companyTimezone || 'Asia/Dhaka';
  const todayStr = resolveReferenceDateStr(input.referenceDate, timezone);

  const dueStr =
    typeof input.dueDate === 'string'
      ? input.dueDate.slice(0, 10)
      : new TZDate(input.dueDate, timezone).toISOString().slice(0, 10);

  if (dueStr > todayStr) {
    return { timingState: INSTALLMENT_TIMING_STATES.UPCOMING, overdueDays: 0 };
  }

  if (dueStr === todayStr) {
    return { timingState: INSTALLMENT_TIMING_STATES.DUE_TODAY, overdueDays: 0 };
  }

  const todayTz = new TZDate(todayStr, timezone);
  const dueTz = new TZDate(dueStr, timezone);
  const overdueDays = Math.max(1, differenceInCalendarDays(todayTz, dueTz));

  return {
    timingState: INSTALLMENT_TIMING_STATES.OVERDUE,
    overdueDays,
  };
}

/**
 * Formats a combined status label according to PRD §9.3 and AT-05 / AT-28.
 * e.g. "Partially Paid · Upcoming", "Partially Paid · Overdue 12 days", "Unpaid · Due Today"
 */
export function getCombinedStatusLabel(
  paymentState: InstallmentPaymentState,
  timingState: InstallmentTimingState | null,
  overdueDays: number,
): string {
  if (!timingState) {
    return paymentState;
  }

  if (timingState === INSTALLMENT_TIMING_STATES.OVERDUE) {
    const dayUnit = overdueDays === 1 ? 'day' : 'days';
    return `${paymentState} · Overdue ${overdueDays} ${dayUnit}`;
  }

  return `${paymentState} · ${timingState}`;
}

/**
 * Derives the complete state bundle for an installment row.
 */
export function deriveInstallmentStatus(
  input: InstallmentBalanceInput & {
    dueDate: Date | string;
    companyTimezone?: string;
    referenceDate?: Date | string;
  },
): InstallmentDerivedStatus {
  const paymentState = computePaymentState(input);
  const remainingAmountPaisa = computeRemainingAmountPaisa(
    input.amountPaisa,
    input.paidAmountPaisa,
    input.waivedAmountPaisa,
  );
  const { timingState, overdueDays } = computeTimingState({
    dueDate: input.dueDate,
    paymentState,
    companyTimezone: input.companyTimezone,
    referenceDate: input.referenceDate,
  });

  const label = getCombinedStatusLabel(paymentState, timingState, overdueDays);

  return {
    paymentState,
    timingState,
    overdueDays,
    label,
    remainingAmountPaisa,
  };
}
