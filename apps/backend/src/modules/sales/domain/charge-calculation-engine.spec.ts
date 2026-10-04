import { describe, expect, it } from 'vitest';
import {
  calculateItemisedCharges,
  computeBaseChargeAmount,
  computeVatAmount,
} from './charge-calculation-engine.js';

describe('Charge Calculation Engine (Domain Core)', () => {
  const netPricePaisa = 100_000_000n; // ৳10,00,000 (10 Lakh Taka)

  describe('computeBaseChargeAmount', () => {
    it('returns exact amount for FIXED calculation type', () => {
      const fixedAmount = 50_000_000n; // ৳5,00,000
      expect(computeBaseChargeAmount(netPricePaisa, 'FIXED', fixedAmount)).toBe(50_000_000n);
    });

    it('throws if FIXED charge lacks amountPaisa or is negative', () => {
      expect(() => computeBaseChargeAmount(netPricePaisa, 'FIXED')).toThrow(
        'Fixed charge requires amountPaisa',
      );
      expect(() => computeBaseChargeAmount(netPricePaisa, 'FIXED', -100n)).toThrow(
        'Charge amount cannot be negative',
      );
    });

    it('computes exact percentage of net price using Money.multiplyByRate', () => {
      // 8% of ৳10,00,000 (100,000,000 paisa) is 8,000,000 paisa (৳80,000)
      expect(computeBaseChargeAmount(netPricePaisa, 'PERCENTAGE', undefined, 8)).toBe(8_000_000n);
      // 1.5% of ৳10,00,000 is 1,500,000 paisa (৳15,000)
      expect(computeBaseChargeAmount(netPricePaisa, 'PERCENTAGE', undefined, 1.5)).toBe(1_500_000n);
    });

    it('throws if PERCENTAGE charge lacks ratePct or is negative', () => {
      expect(() => computeBaseChargeAmount(netPricePaisa, 'PERCENTAGE')).toThrow(
        'Percentage charge requires ratePct',
      );
      expect(() => computeBaseChargeAmount(netPricePaisa, 'PERCENTAGE', undefined, -2)).toThrow(
        'Charge percentage rate cannot be negative',
      );
    });
  });

  describe('computeVatAmount', () => {
    it('returns 0n when vatRatePct is 0 or undefined', () => {
      expect(computeVatAmount(10_000_000n, 0)).toBe(0n);
      expect(computeVatAmount(10_000_000n)).toBe(0n);
    });

    it('computes VAT amount according to configuration rate', () => {
      // 5% VAT on 10,000,000 paisa is 500,000 paisa
      expect(computeVatAmount(10_000_000n, 5)).toBe(500_000n);
      // 15% VAT on 20,000,000 paisa is 3,000,000 paisa
      expect(computeVatAmount(20_000_000n, 15)).toBe(3_000_000n);
    });

    it('throws if VAT rate is negative', () => {
      expect(() => computeVatAmount(10_000_000n, -5)).toThrow(
        'VAT rate percentage cannot be negative',
      );
    });
  });

  describe('calculateItemisedCharges', () => {
    it('calculates mixed fixed and percentage charges, respecting included vs additional', () => {
      // Net price: ৳10,00,000 (100,000,000 paisa)
      // Charge 1: Car Parking ৳1,00,000 (10,000,000 paisa), additional, VAT 0%
      // Charge 2: Utility Connection ৳50,000 (5,000,000 paisa), additional, VAT 5% (250,000 paisa)
      // Charge 3: Document fee 1% of net price (1,000,000 paisa), included in price, VAT 0%
      const res = calculateItemisedCharges(netPricePaisa, [
        {
          name: 'Car Parking Space',
          chargeTypeCode: 'PARKING',
          calculationType: 'FIXED',
          amountPaisa: 10_000_000n,
          isIncludedInNetPrice: false,
          payableStage: 'AT_BOOKING',
          vatRatePct: 0,
        },
        {
          name: 'Utility Connection Charge',
          chargeTypeCode: 'UTILITY',
          calculationType: 'FIXED',
          amountPaisa: 5_000_000n,
          isIncludedInNetPrice: false,
          payableStage: 'AT_HANDOVER',
          vatRatePct: 5,
        },
        {
          name: 'Documentation Fee',
          chargeTypeCode: 'DOC_FEE',
          calculationType: 'PERCENTAGE',
          ratePct: 1,
          isIncludedInNetPrice: true,
          payableStage: 'AT_BOOKING',
          vatRatePct: 0,
        },
      ]);

      expect(res.netPricePaisa).toBe(100_000_000n);
      expect(res.netPriceFormatted).toBe('৳10,00,000.00');

      // Included charge = 1% of 100M = 1,000,000n
      expect(res.totalIncludedChargesPaisa).toBe(1_000_000n);

      // Additional charges base = 10,000,000n + 5,000,000n = 15,000,000n
      expect(res.totalAdditionalChargesPaisa).toBe(15_000_000n);

      // VAT = 5% of 5,000,000n = 250,000n
      expect(res.totalVatPaisa).toBe(250_000n);

      // Grand total = 100M + 15M + 250k = 115,250,000n (৳11,52,500.00)
      expect(res.grandTotalPaisa).toBe(115_250_000n);
      expect(res.grandTotalFormatted).toBe('৳11,52,500.00');

      // Line items detail
      expect(res.items).toHaveLength(3);
      expect(res.items[0]!.baseAmountPaisa).toBe(10_000_000n);
      expect(res.items[0]!.vatAmountPaisa).toBe(0n);
      expect(res.items[0]!.totalAmountPaisa).toBe(10_000_000n);

      expect(res.items[1]!.baseAmountPaisa).toBe(5_000_000n);
      expect(res.items[1]!.vatAmountPaisa).toBe(250_000n);
      expect(res.items[1]!.totalAmountPaisa).toBe(5_250_000n);

      expect(res.items[2]!.baseAmountPaisa).toBe(1_000_000n);
      expect(res.items[2]!.isIncludedInNetPrice).toBe(true);
    });

    it('handles empty charges list returning net price as grand total', () => {
      const res = calculateItemisedCharges(netPricePaisa, []);
      expect(res.grandTotalPaisa).toBe(netPricePaisa);
      expect(res.totalAdditionalChargesPaisa).toBe(0n);
      expect(res.totalVatPaisa).toBe(0n);
      expect(res.items).toHaveLength(0);
    });

    it('throws if net price is negative', () => {
      expect(() => calculateItemisedCharges(-1n, [])).toThrow('Net price cannot be negative');
    });
  });
});
