import { describe, expect, it } from 'vitest';
import { allocatePayment, type InstallmentAllocationTarget } from './allocation-engine.js';

describe('Payment Allocation Engine (PRD §9.4, FLOW-07, AT-05, AT-22)', () => {
  const dummyInstallments: InstallmentAllocationTarget[] = [
    {
      id: 'inst-1',
      installmentNumber: 1,
      name: 'Booking Money',
      type: 'BOOKING_AMOUNT',
      dueDate: '2026-10-01',
      amountPaisa: 50000000n, // ৳5,00,000
      paidAmountPaisa: 0n,
      remainingAmountPaisa: 50000000n,
    },
    {
      id: 'inst-2',
      installmentNumber: 2,
      name: 'Down Payment',
      type: 'DOWN_PAYMENT',
      dueDate: '2026-11-01',
      amountPaisa: 50000000n, // ৳5,00,000
      paidAmountPaisa: 0n,
      remainingAmountPaisa: 50000000n,
    },
    {
      id: 'inst-3',
      installmentNumber: 3,
      name: 'Installment 1',
      type: 'REGULAR',
      dueDate: '2026-12-01',
      amountPaisa: 30000000n, // ৳3,00,000
      paidAmountPaisa: 0n,
      remainingAmountPaisa: 30000000n,
    },
  ];

  it('AT-05: partial payment of ৳1,00,000 towards ৳3,00,000 installment leaves ৳2,00,000 remaining', () => {
    const singleInst: InstallmentAllocationTarget[] = [
      {
        id: 'inst-3',
        installmentNumber: 1,
        name: 'Installment 1',
        type: 'REGULAR',
        dueDate: '2026-11-01',
        amountPaisa: 30000000n,
        paidAmountPaisa: 0n,
        remainingAmountPaisa: 30000000n,
      },
    ];

    const result = allocatePayment({
      paymentAmountPaisa: 10000000n, // ৳1,00,000
      installments: singleInst,
    });

    expect(result.totalAllocatedPaisa).toBe(10000000n);
    expect(result.overpaymentPaisa).toBe(0n);
    expect(result.installmentAllocations).toHaveLength(1);

    const alloc = result.installmentAllocations[0]!;
    expect(alloc.allocatedPaisa).toBe(10000000n);
    expect(alloc.newPaidPaisa).toBe(10000000n);
    expect(alloc.newRemainingPaisa).toBe(20000000n);
    expect(alloc.newPaymentState).toBe('Partially Paid');
  });

  it('AT-22: overpayment is strictly preserved as customer advance', () => {
    const singleInst: InstallmentAllocationTarget[] = [
      {
        id: 'inst-1',
        installmentNumber: 1,
        name: 'Installment 1',
        type: 'REGULAR',
        dueDate: '2026-11-01',
        amountPaisa: 30000000n, // ৳3,00,000
        paidAmountPaisa: 0n,
        remainingAmountPaisa: 30000000n,
      },
    ];

    const result = allocatePayment({
      paymentAmountPaisa: 35000000n, // ৳3,50,000
      installments: singleInst,
    });

    expect(result.totalAllocatedPaisa).toBe(30000000n);
    expect(result.overpaymentPaisa).toBe(5000000n); // ৳50,000 advance
    expect(result.installmentAllocations[0]?.newPaymentState).toBe('Paid');
    expect(result.totalAllocatedPaisa + result.overpaymentPaisa).toBe(35000000n);
  });

  it('allocates according to default order (BOOKING_AMOUNT -> DOWNPAYMENT -> REGULAR)', () => {
    const result = allocatePayment({
      paymentAmountPaisa: 75000000n, // ৳7,50,000 (covers ৳5,00,000 booking + ৳2,50,000 down payment)
      installments: dummyInstallments,
    });

    expect(result.totalAllocatedPaisa).toBe(75000000n);
    expect(result.overpaymentPaisa).toBe(0n);
    expect(result.installmentAllocations).toHaveLength(2);

    expect(result.installmentAllocations[0]?.installmentId).toBe('inst-1');
    expect(result.installmentAllocations[0]?.allocatedPaisa).toBe(50000000n);
    expect(result.installmentAllocations[0]?.newPaymentState).toBe('Paid');

    expect(result.installmentAllocations[1]?.installmentId).toBe('inst-2');
    expect(result.installmentAllocations[1]?.allocatedPaisa).toBe(25000000n);
    expect(result.installmentAllocations[1]?.newRemainingPaisa).toBe(25000000n);
    expect(result.installmentAllocations[1]?.newPaymentState).toBe('Partially Paid');
  });

  it('respects targetInstallmentId by prioritizing it over earlier installments', () => {
    const result = allocatePayment({
      paymentAmountPaisa: 30000000n, // ৳3,00,000 explicitly for inst-3
      targetInstallmentId: 'inst-3',
      installments: dummyInstallments,
    });

    expect(result.totalAllocatedPaisa).toBe(30000000n);
    expect(result.installmentAllocations).toHaveLength(1);
    expect(result.installmentAllocations[0]?.installmentId).toBe('inst-3');
    expect(result.installmentAllocations[0]?.newPaymentState).toBe('Paid');
  });
});
