import { computePaymentState, computeRemainingAmountPaisa } from '../../installment/domain/installment-state.js';

export interface InstallmentAllocationTarget {
  id: string;
  installmentNumber: number;
  name: string;
  type: string; // 'BOOKING_AMOUNT', 'DOWN_PAYMENT', 'REGULAR', 'SPECIAL', 'MILESTONE'
  dueDate: Date | string;
  amountPaisa: bigint;
  paidAmountPaisa: bigint;
  remainingAmountPaisa: bigint;
  lateFeePaisa?: bigint;
}

export interface AllocationEngineInput {
  paymentAmountPaisa: bigint;
  targetInstallmentId?: string | null;
  allocationTarget?: string | null;
  installments: InstallmentAllocationTarget[];
}

export interface InstallmentAllocationResult {
  installmentId: string;
  allocatedPaisa: bigint;
  previousPaidPaisa: bigint;
  newPaidPaisa: bigint;
  newRemainingPaisa: bigint;
  newPaymentState: string;
}

export interface AllocationEngineResult {
  totalAmountPaisa: bigint;
  totalAllocatedPaisa: bigint;
  overpaymentPaisa: bigint;
  installmentAllocations: InstallmentAllocationResult[];
}

function getPriorityScore(type: string): number {
  if (type === 'BOOKING_AMOUNT') return 1;
  if (type === 'DOWN_PAYMENT') return 2;
  return 3;
}

function sortInstallmentsForAllocation(
  installments: InstallmentAllocationTarget[],
  targetInstallmentId?: string | null,
): InstallmentAllocationTarget[] {
  return [...installments].sort((a, b) => {
    // Target installment gets absolute priority
    if (targetInstallmentId) {
      if (a.id === targetInstallmentId) return -1;
      if (b.id === targetInstallmentId) return 1;
    }

    const priorityA = getPriorityScore(a.type);
    const priorityB = getPriorityScore(b.type);
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    const dueA = typeof a.dueDate === 'string' ? a.dueDate.slice(0, 10) : a.dueDate.toISOString().slice(0, 10);
    const dueB = typeof b.dueDate === 'string' ? b.dueDate.slice(0, 10) : b.dueDate.toISOString().slice(0, 10);
    if (dueA !== dueB) {
      return dueA.localeCompare(dueB);
    }

    return a.installmentNumber - b.installmentNumber;
  });
}

function allocateToSingleInstallment(
  inst: InstallmentAllocationTarget,
  remainingAmount: bigint,
): { allocated: bigint; result?: InstallmentAllocationResult } {
  if (remainingAmount <= 0n || inst.remainingAmountPaisa <= 0n) {
    return { allocated: 0n };
  }

  const allocated =
    remainingAmount >= inst.remainingAmountPaisa ? inst.remainingAmountPaisa : remainingAmount;

  const newPaidPaisa = inst.paidAmountPaisa + allocated;
  const newRemainingPaisa = computeRemainingAmountPaisa(inst.amountPaisa, newPaidPaisa, 0n);
  const newPaymentState = computePaymentState({
    amountPaisa: inst.amountPaisa,
    paidAmountPaisa: newPaidPaisa,
  });

  return {
    allocated,
    result: {
      installmentId: inst.id,
      allocatedPaisa: allocated,
      previousPaidPaisa: inst.paidAmountPaisa,
      newPaidPaisa,
      newRemainingPaisa,
      newPaymentState,
    },
  };
}

/**
 * Pure allocation engine enforcing default order:
 * BOOKING_AMOUNT -> DOWNPAYMENT -> LATE_FEE -> INSTALLMENT_OLDEST_FIRST -> CUSTOMER_ADVANCE
 * Conservation: totalAllocatedPaisa + overpaymentPaisa === paymentAmountPaisa
 */
export function allocatePayment(input: AllocationEngineInput): AllocationEngineResult {
  const { paymentAmountPaisa, targetInstallmentId, installments } = input;
  if (paymentAmountPaisa <= 0n) {
    return {
      totalAmountPaisa: 0n,
      totalAllocatedPaisa: 0n,
      overpaymentPaisa: 0n,
      installmentAllocations: [],
    };
  }

  const sorted = sortInstallmentsForAllocation(installments, targetInstallmentId);
  const allocations: InstallmentAllocationResult[] = [];
  let remainingPaisa = paymentAmountPaisa;
  let totalAllocatedPaisa = 0n;

  for (const inst of sorted) {
    if (remainingPaisa <= 0n) {
      break;
    }

    const { allocated, result } = allocateToSingleInstallment(inst, remainingPaisa);
    if (allocated > 0n && result) {
      allocations.push(result);
      totalAllocatedPaisa += allocated;
      remainingPaisa -= allocated;
    }
  }

  const overpaymentPaisa = remainingPaisa;

  return {
    totalAmountPaisa: paymentAmountPaisa,
    totalAllocatedPaisa,
    overpaymentPaisa,
    installmentAllocations: allocations,
  };
}
