import { describe, expect, it } from 'vitest';
import { INSTALLMENT_PAYMENT_STATES, INSTALLMENT_TIMING_STATES } from '@exzaestate/shared';
import {
  computePaymentState,
  computeRemainingAmountPaisa,
  computeTimingState,
  deriveInstallmentStatus,
  getCombinedStatusLabel,
} from './installment-state.js';

describe('Installment State Domain Engine (PRD §9.3, AT-05, AT-28)', () => {
  describe('computeRemainingAmountPaisa', () => {
    it('calculates remaining balance accurately in paisa', () => {
      // ৳3,00,000 amount, ৳1,00,000 paid -> ৳2,00,000 remaining
      expect(computeRemainingAmountPaisa(30000000n, 10000000n, 0n)).toBe(20000000n);
      // Fully paid
      expect(computeRemainingAmountPaisa(30000000n, 30000000n, 0n)).toBe(0n);
      // Overpaid
      expect(computeRemainingAmountPaisa(30000000n, 35000000n, 0n)).toBe(0n);
      // Partial paid + partial waived
      expect(computeRemainingAmountPaisa(30000000n, 10000000n, 5000000n)).toBe(15000000n);
    });
  });

  describe('computePaymentState', () => {
    it('returns Unpaid when nothing has been paid or waived', () => {
      const state = computePaymentState({
        amountPaisa: 30000000n,
        paidAmountPaisa: 0n,
        waivedAmountPaisa: 0n,
      });
      expect(state).toBe(INSTALLMENT_PAYMENT_STATES.UNPAID);
    });

    it('returns Partially Paid when paid is between 0 and total amount', () => {
      const state = computePaymentState({
        amountPaisa: 30000000n,
        paidAmountPaisa: 10000000n,
      });
      expect(state).toBe(INSTALLMENT_PAYMENT_STATES.PARTIALLY_PAID);
    });

    it('returns Paid when paidAmount equals or exceeds amount', () => {
      const state = computePaymentState({
        amountPaisa: 30000000n,
        paidAmountPaisa: 30000000n,
      });
      expect(state).toBe(INSTALLMENT_PAYMENT_STATES.PAID);
    });

    it('returns Waived when fully waived without payments', () => {
      const state = computePaymentState({
        amountPaisa: 30000000n,
        paidAmountPaisa: 0n,
        waivedAmountPaisa: 30000000n,
      });
      expect(state).toBe(INSTALLMENT_PAYMENT_STATES.WAIVED);
    });

    it('returns Cancelled if marked cancelled', () => {
      const state = computePaymentState({
        amountPaisa: 30000000n,
        isCancelled: true,
      });
      expect(state).toBe(INSTALLMENT_PAYMENT_STATES.CANCELLED);
    });
  });

  describe('computeTimingState & getCombinedStatusLabel', () => {
    const timezone = 'Asia/Dhaka';
    const referenceDate = '2026-10-15'; // Today is 2026-10-15

    it('AT-05: ৳3,00,000 installment with ৳1,00,000 paid before due is Partially Paid · Upcoming, remaining ৳2,00,000', () => {
      const result = deriveInstallmentStatus({
        amountPaisa: 30000000n,
        paidAmountPaisa: 10000000n,
        dueDate: '2026-10-25',
        companyTimezone: timezone,
        referenceDate,
      });

      expect(result.paymentState).toBe(INSTALLMENT_PAYMENT_STATES.PARTIALLY_PAID);
      expect(result.timingState).toBe(INSTALLMENT_TIMING_STATES.UPCOMING);
      expect(result.overdueDays).toBe(0);
      expect(result.label).toBe('Partially Paid · Upcoming');
      expect(result.remainingAmountPaisa).toBe(20000000n);
    });

    it('derives Due Today when due date matches reference date', () => {
      const { timingState, overdueDays } = computeTimingState({
        dueDate: '2026-10-15',
        paymentState: INSTALLMENT_PAYMENT_STATES.UNPAID,
        companyTimezone: timezone,
        referenceDate,
      });

      expect(timingState).toBe(INSTALLMENT_TIMING_STATES.DUE_TODAY);
      expect(overdueDays).toBe(0);
      expect(
        getCombinedStatusLabel(INSTALLMENT_PAYMENT_STATES.UNPAID, timingState, overdueDays),
      ).toBe('Unpaid · Due Today');
    });

    it('derives Overdue and exact overdue days when due date has passed', () => {
      const { timingState, overdueDays } = computeTimingState({
        dueDate: '2026-10-03', // 12 days ago
        paymentState: INSTALLMENT_PAYMENT_STATES.PARTIALLY_PAID,
        companyTimezone: timezone,
        referenceDate,
      });

      expect(timingState).toBe(INSTALLMENT_TIMING_STATES.OVERDUE);
      expect(overdueDays).toBe(12);
      expect(
        getCombinedStatusLabel(INSTALLMENT_PAYMENT_STATES.PARTIALLY_PAID, timingState, overdueDays),
      ).toBe('Partially Paid · Overdue 12 days');
    });

    it('returns singular day unit for 1 day overdue', () => {
      const { timingState, overdueDays } = computeTimingState({
        dueDate: '2026-10-14', // 1 day ago
        paymentState: INSTALLMENT_PAYMENT_STATES.UNPAID,
        companyTimezone: timezone,
        referenceDate,
      });

      expect(timingState).toBe(INSTALLMENT_TIMING_STATES.OVERDUE);
      expect(overdueDays).toBe(1);
      expect(
        getCombinedStatusLabel(INSTALLMENT_PAYMENT_STATES.UNPAID, timingState, overdueDays),
      ).toBe('Unpaid · Overdue 1 day');
    });

    it('terminal states (Paid, Waived, Cancelled) carry no timing state', () => {
      for (const terminalState of [
        INSTALLMENT_PAYMENT_STATES.PAID,
        INSTALLMENT_PAYMENT_STATES.WAIVED,
        INSTALLMENT_PAYMENT_STATES.CANCELLED,
      ]) {
        const { timingState } = computeTimingState({
          dueDate: '2026-10-01', // in the past
          paymentState: terminalState,
          companyTimezone: timezone,
          referenceDate,
        });

        expect(timingState).toBeNull();
        expect(getCombinedStatusLabel(terminalState, timingState, 0)).toBe(terminalState);
      }
    });
  });
});
