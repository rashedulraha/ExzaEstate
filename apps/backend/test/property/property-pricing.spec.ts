import { describe, expect, it } from 'vitest';
import {
  calculateNetPrice,
  calculatePricingBreakdown,
  validateDiscountLimit,
} from '../../src/modules/property/domain/property-pricing.js';

describe('Property Pricing Domain (Task A2.2 S1)', () => {
  describe('calculateNetPrice', () => {
    it('calculates net price correctly: base + premium - discount + charges = net', () => {
      const base = 5_000_000_00n; // 50,00,000 BDT
      const premium = 500_000_00n; // 5,00,000 BDT
      const discount = 200_000_00n; // 2,00,000 BDT
      const charges = 300_000_00n; // 3,00,000 BDT

      const net = calculateNetPrice(base, premium, discount, charges);
      // 5,000,000 + 500,000 - 200,000 + 300,000 = 5,600,000 BDT
      expect(net).toBe(5_600_000_00n);
    });

    it('defaults premium, discount and charges to zero if omitted', () => {
      const base = 7_500_000_00n;
      const net = calculateNetPrice(base);
      expect(net).toBe(7_500_000_00n);
    });

    it('throws if base price is negative', () => {
      expect(() => calculateNetPrice(-100n)).toThrow('Base price cannot be negative');
    });

    it('throws if discount exceeds gross price (base + premium)', () => {
      const base = 1_000_000_00n;
      const premium = 100_000_00n;
      const discount = 1_200_000_00n;
      expect(() => calculateNetPrice(base, premium, discount, 0n)).toThrow(
        'Discount cannot exceed gross price',
      );
    });
  });

  describe('calculatePricingBreakdown', () => {
    it('computes breakdown from fixed discount paisa', () => {
      const breakdown = calculatePricingBreakdown({
        basePricePaisa: 10_000_000_00n, // 1 crore
        premiumPaisa: 1_000_000_00n, // 10 lakh
        discountPaisa: 550_000_00n, // 5.5 lakh = 5.0% of 1.10 crore
        charges: [
          { code: 'UTILITY', name: 'Utility Connection', amountPaisa: 250_000_00n },
          { code: 'PARKING', name: 'Parking Allocation', amountPaisa: 500_000_00n },
        ],
        discountLimitPct: 5.0,
      });

      expect(breakdown.basePricePaisa).toBe(10_000_000_00n);
      expect(breakdown.premiumPaisa).toBe(1_000_000_00n);
      expect(breakdown.grossPricePaisa).toBe(11_000_000_00n);
      expect(breakdown.discountPaisa).toBe(550_000_00n);
      expect(breakdown.discountPct).toBe(5.0);
      expect(breakdown.chargesTotalPaisa).toBe(750_000_00n);
      // gross (1.10 cr) - discount (5.5 lakh) + charges (7.5 lakh) = 1.12 cr (11,200,000 BDT)
      expect(breakdown.netPricePaisa).toBe(11_200_000_00n);
      expect(breakdown.isWithinDiscountLimit).toBe(true);
    });

    it('computes breakdown from discount percentage', () => {
      const breakdown = calculatePricingBreakdown({
        basePricePaisa: 20_000_000_00n,
        premiumPaisa: 0n,
        discountPct: 3.5, // 3.5% of 20,000,000 = 700,000 BDT
        discountLimitPct: 3.0, // limit is 3.0%, so 3.5% exceeds limit
      });

      expect(breakdown.discountPaisa).toBe(700_000_00n);
      expect(breakdown.discountPct).toBe(3.5);
      expect(breakdown.netPricePaisa).toBe(19_300_000_00n);
      expect(breakdown.isWithinDiscountLimit).toBe(false);
    });

    it('handles zero discount cleanly', () => {
      const breakdown = calculatePricingBreakdown({
        basePricePaisa: 5_000_000_00n,
      });

      expect(breakdown.grossPricePaisa).toBe(5_000_000_00n);
      expect(breakdown.discountPaisa).toBe(0n);
      expect(breakdown.discountPct).toBe(0);
      expect(breakdown.chargesTotalPaisa).toBe(0n);
      expect(breakdown.netPricePaisa).toBe(5_000_000_00n);
      expect(breakdown.isWithinDiscountLimit).toBe(true);
    });

    it('rejects negative charges or negative premium', () => {
      expect(() =>
        calculatePricingBreakdown({
          basePricePaisa: 1_000_000_00n,
          premiumPaisa: -50n,
        }),
      ).toThrow('Premium cannot be negative');

      expect(() =>
        calculatePricingBreakdown({
          basePricePaisa: 1_000_000_00n,
          charges: [{ code: 'TEST', name: 'Invalid', amountPaisa: -100n }],
        }),
      ).toThrow('Charge amounts cannot be negative');
    });
  });

  describe('validateDiscountLimit', () => {
    it('returns true when discount is within or equal to limit', () => {
      expect(validateDiscountLimit(2.5, 5.0)).toBe(true);
      expect(validateDiscountLimit(5.0, 5.0)).toBe(true);
      expect(validateDiscountLimit(0, 5.0)).toBe(true);
    });

    it('returns false when discount exceeds limit', () => {
      expect(validateDiscountLimit(5.01, 5.0)).toBe(false);
      expect(validateDiscountLimit(10.0, 5.0)).toBe(false);
    });
  });
});
