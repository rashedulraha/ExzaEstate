import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';
import {
  addBusinessMonths,
  buildSchedule,
  validateBookingAmount,
} from './installment-schedule-engine.js';

describe('Installment Schedule Engine (Domain Core)', () => {
  describe('AT-23 Acceptance Test', () => {
    it('splits ৳1,00,000 into 3 installments = 33,333.34 + 33,333.33 + 33,333.33 with zero paisa lost', () => {
      // ৳1,00,000 = 100,000 * 100 = 10,000,000 paisa
      const netPricePaisa = 10_000_000n;

      const schedule = buildSchedule({
        netPricePaisa,
        bookingAmountPaisa: 0n,
        downPaymentPaisa: 0n,
        installmentCount: 3,
        firstDueDate: '2026-01-10',
        frequency: 'MONTHLY',
        minBookingPct: 0,
      });

      expect(schedule.items).toHaveLength(3);
      expect(schedule.items[0]?.amountPaisa).toBe(3_333_334n);
      expect(schedule.items[1]?.amountPaisa).toBe(3_333_333n);
      expect(schedule.items[2]?.amountPaisa).toBe(3_333_333n);

      const sum = schedule.items.reduce((acc, it) => acc + it.amountPaisa, 0n);
      expect(sum).toBe(netPricePaisa);
      expect(schedule.totalScheduledPaisa).toBe(netPricePaisa);

      expect(schedule.items[0]?.amountFormatted).toBe('BDT 33,333.34');
      expect(schedule.items[1]?.amountFormatted).toBe('BDT 33,333.33');
      expect(schedule.items[2]?.amountFormatted).toBe('BDT 33,333.33');
    });
  });

  describe('addBusinessMonths (Calendar day clamping without UTC drift)', () => {
    it('advances normal monthly dates correctly', () => {
      expect(addBusinessMonths('2026-01-15', 1)).toBe('2026-02-15');
      expect(addBusinessMonths('2026-01-15', 6)).toBe('2026-07-15');
      expect(addBusinessMonths('2026-01-15', 12)).toBe('2027-01-15');
    });

    it('clamps 31st to 28th in February (non-leap year 2026)', () => {
      expect(addBusinessMonths('2026-01-31', 1)).toBe('2026-02-28');
    });

    it('clamps 31st to 29th in February (leap year 2028)', () => {
      expect(addBusinessMonths('2028-01-31', 1)).toBe('2028-02-29');
    });

    it('clamps 31st to 30th for 30-day months (April, June, etc.)', () => {
      expect(addBusinessMonths('2026-01-31', 3)).toBe('2026-04-30');
      expect(addBusinessMonths('2026-01-31', 5)).toBe('2026-06-30');
      expect(addBusinessMonths('2026-01-31', 8)).toBe('2026-09-30');
      expect(addBusinessMonths('2026-01-31', 10)).toBe('2026-11-30');
    });

    it('returns original 31st when advancing to another 31-day month', () => {
      expect(addBusinessMonths('2026-01-31', 2)).toBe('2026-03-31');
      expect(addBusinessMonths('2026-01-31', 4)).toBe('2026-05-31');
    });

    it('handles year transitions cleanly', () => {
      expect(addBusinessMonths('2026-11-20', 3)).toBe('2027-02-20');
      expect(addBusinessMonths('2026-12-10', 24)).toBe('2028-12-10');
    });

    it('returns same date when monthsToAdd is 0', () => {
      expect(addBusinessMonths('2026-05-15', 0)).toBe('2026-05-15');
    });
  });

  describe('validateBookingAmount', () => {
    it('throws if booking amount is negative', () => {
      expect(() => validateBookingAmount(10_000_000n, -1n)).toThrow(
        'Booking amount cannot be negative',
      );
    });

    it('throws if booking amount exceeds net price', () => {
      expect(() => validateBookingAmount(10_000_000n, 10_000_001n)).toThrow(
        'Booking amount cannot exceed net price',
      );
    });

    it('throws if booking amount is less than minBookingPct', () => {
      // 10% of 10,000,000 is 1,000,000
      expect(() => validateBookingAmount(10_000_000n, 999_999n, 10)).toThrow(
        'Booking amount cannot be less than 10%',
      );
    });

    it('allows booking amount when it meets or exceeds minBookingPct', () => {
      expect(() => validateBookingAmount(10_000_000n, 1_000_000n, 10)).not.toThrow();
      expect(() => validateBookingAmount(10_000_000n, 2_000_000n, 10)).not.toThrow();
    });
  });

  describe('Standard Equal Installment Schedules', () => {
    it('creates schedule with booking amount, down payment, and installments', () => {
      const netPrice = 50_000_000n; // ৳5,00,000
      const booking = 5_000_000n; // ৳50,000 (10%)
      const downPayment = 5_000_000n; // ৳50,000 (10%)
      // Remaining = 40,000,000n across 4 installments -> 10,000,000n each

      const res = buildSchedule({
        netPricePaisa: netPrice,
        bookingAmountPaisa: booking,
        downPaymentPaisa: downPayment,
        installmentCount: 4,
        firstDueDate: '2026-03-01',
        frequency: 'MONTHLY',
      });

      expect(res.items).toHaveLength(6);
      expect(res.items[0]!.type).toBe('BOOKING_AMOUNT');
      expect(res.items[0]!.amountPaisa).toBe(5_000_000n);
      expect(res.items[0]!.dueDate).toBe('2026-03-01');

      expect(res.items[1]!.type).toBe('DOWN_PAYMENT');
      expect(res.items[1]!.amountPaisa).toBe(5_000_000n);
      expect(res.items[1]!.dueDate).toBe('2026-04-01');

      expect(res.items[2]!.type).toBe('INSTALLMENT');
      expect(res.items[2]!.amountPaisa).toBe(10_000_000n);
      expect(res.items[2]!.dueDate).toBe('2026-03-01');

      expect(res.items[5]!.amountPaisa).toBe(10_000_000n);
      expect(res.items[5]!.dueDate).toBe('2026-06-01');

      expect(res.totalScheduledPaisa).toBe(netPrice);
    });

    it('respects frequency intervals (QUARTERLY, HALF_YEARLY, YEARLY)', () => {
      const res = buildSchedule({
        netPricePaisa: 12_000_000n,
        bookingAmountPaisa: 0n,
        installmentCount: 4,
        firstDueDate: '2026-01-15',
        frequency: 'QUARTERLY',
        minBookingPct: 0,
      });

      expect(res.items[0]!.dueDate).toBe('2026-01-15');
      expect(res.items[1]!.dueDate).toBe('2026-04-15');
      expect(res.items[2]!.dueDate).toBe('2026-07-15');
      expect(res.items[3]!.dueDate).toBe('2026-10-15');
    });
  });

  describe('Custom Milestone Schedules', () => {
    it('allocates milestone percentages with exact sum and no lost paisa', () => {
      const netPrice = 100_000_000n; // ৳10,00,000
      const booking = 10_000_000n; // ৳1,00,000
      // Remaining = 90,000,000n

      const res = buildSchedule({
        netPricePaisa: netPrice,
        bookingAmountPaisa: booking,
        firstDueDate: '2026-01-01',
        customMilestones: [
          { name: 'Piling Completion', percentage: 20 },
          { name: 'Roof Casting', percentage: 30 },
          { name: 'Handover', percentage: 50 },
        ],
      });

      expect(res.items).toHaveLength(4); // 1 booking + 3 milestones
      expect(res.items[1]!.name).toBe('Piling Completion');
      expect(res.items[1]!.amountPaisa).toBe(18_000_000n); // 20% of 90M
      expect(res.items[2]!.amountPaisa).toBe(27_000_000n); // 30% of 90M
      expect(res.items[3]!.amountPaisa).toBe(45_000_000n); // 50% of 90M
      expect(res.totalScheduledPaisa).toBe(netPrice);
    });

    it('validates explicit amount milestones must exactly equal remaining balance', () => {
      expect(() =>
        buildSchedule({
          netPricePaisa: 10_000_000n,
          bookingAmountPaisa: 1_000_000n,
          firstDueDate: '2026-01-01',
          customMilestones: [
            { name: 'Part 1', amountPaisa: '4000000' },
            { name: 'Part 2', amountPaisa: '4000000' }, // Sum = 8M, required = 9M
          ],
        }),
      ).toThrow('Sum of custom installment amounts');
    });
  });

  describe('Property-Based Invariants (fast-check)', () => {
    it('preserves conservation of money: total scheduled ALWAYS strictly equals netPricePaisa', () => {
      fc.assert(
        fc.property(
          // Net price from ৳1,000 (100,000 paisa) to ৳100 Crore (10,000,000,000,000 paisa)
          fc.bigInt({ min: 100_000n, max: 10_000_000_000_000n }),
          // Booking percentage from 0 to 50%
          fc.integer({ min: 0, max: 50 }),
          // Down payment percentage from 0 to 30%
          fc.integer({ min: 0, max: 30 }),
          // Installment count from 1 to 60
          fc.integer({ min: 1, max: 60 }),
          (netPricePaisa, bookingPct, downPaymentPct, installmentCount) => {
            const bookingAmountPaisa = (netPricePaisa * BigInt(bookingPct)) / 100n;
            const downPaymentPaisa = (netPricePaisa * BigInt(downPaymentPct)) / 100n;

            const schedule = buildSchedule({
              netPricePaisa,
              bookingAmountPaisa,
              downPaymentPaisa,
              installmentCount,
              firstDueDate: '2026-01-01',
              frequency: 'MONTHLY',
              minBookingPct: 0,
            });

            const sumOfItems = schedule.items.reduce((acc, item) => acc + item.amountPaisa, 0n);

            return (
              schedule.totalScheduledPaisa === netPricePaisa &&
              sumOfItems === netPricePaisa &&
              schedule.remainingPaisa === netPricePaisa - bookingAmountPaisa - downPaymentPaisa
            );
          },
        ),
        { numRuns: 200 },
      );
    });

    it('preserves conservation of money with arbitrary milestone ratio weights', () => {
      fc.assert(
        fc.property(
          fc.bigInt({ min: 100_000n, max: 10_000_000_000_000n }),
          fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 1, maxLength: 15 }),
          (netPricePaisa, weights) => {
            const milestones = weights.map((w, idx) => ({
              name: `Milestone ${idx + 1}`,
              percentage: w,
            }));

            const schedule = buildSchedule({
              netPricePaisa,
              bookingAmountPaisa: 0n,
              firstDueDate: '2026-06-15',
              customMilestones: milestones,
              minBookingPct: 0,
            });

            const sumOfItems = schedule.items.reduce((acc, item) => acc + item.amountPaisa, 0n);
            return sumOfItems === netPricePaisa && schedule.totalScheduledPaisa === netPricePaisa;
          },
        ),
        { numRuns: 200 },
      );
    });
  });
});
