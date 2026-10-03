import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { Money } from './money.js';

describe('Money Engine (Tier 1)', () => {
  describe('Basic arithmetic', () => {
    it('adds two amounts correctly', () => {
      expect(Money.add(100n, 200n)).toBe(300n);
      expect(Money.add(-50n, 50n)).toBe(0n);
    });

    it('subtracts two amounts correctly', () => {
      expect(Money.subtract(300n, 100n)).toBe(200n);
      expect(Money.subtract(100n, 300n)).toBe(-200n);
    });
  });

  describe('Conversions & Parsing', () => {
    it('converts from API string', () => {
      expect(Money.fromApi('50000000')).toBe(50000000n);
      expect(Money.fromApi('-1250000')).toBe(-1250000n);
    });

    it('converts from paisa inputs', () => {
      expect(Money.fromPaisa(12345n)).toBe(12345n);
      expect(Money.fromPaisa('12345')).toBe(12345n);
      expect(Money.fromPaisa(12345)).toBe(12345n);
    });

    it('converts taka to paisa with exact parsing', () => {
      expect(Money.toPaisa('500')).toBe(50000n);
      expect(Money.toPaisa('500.00')).toBe(50000n);
      expect(Money.toPaisa('500.25')).toBe(50025n);
      expect(Money.toPaisa('-500.25')).toBe(-50025n);
      expect(Money.toPaisa(500.25)).toBe(50025n);
    });
  });

  describe('Multiplication & Rounding (Round half away from zero)', () => {
    it('multiplies by decimal rate with half-away-from-zero rounding', () => {
      // 100 paisa * 0.155 = 15.5 -> 16 paisa
      expect(Money.multiplyByRate(100n, '0.155')).toBe(16n);
      // 100 paisa * 0.154 = 15.4 -> 15 paisa
      expect(Money.multiplyByRate(100n, '0.154')).toBe(15n);
      // Negative: -100 paisa * 0.155 = -15.5 -> -16 paisa (-0.5 rounds away from zero to -1)
      expect(Money.multiplyByRate(-100n, '0.155')).toBe(-16n);
      // -100 paisa * 0.154 = -15.4 -> -15 paisa
      expect(Money.multiplyByRate(-100n, '0.154')).toBe(-15n);
    });
  });

  describe('Allocation (Largest-remainder algorithm)', () => {
    it('satisfies acceptance test AT-23: 10,000,000 paisa split into 3 equal parts', () => {
      const parts = Money.allocate(10000000n, [1, 1, 1]);
      expect(parts).toEqual([3333334n, 3333333n, 3333333n]);
      expect(parts[0]! + parts[1]! + parts[2]!).toBe(10000000n);
    });

    it('allocates according to varying ratios', () => {
      // 100 paisa into 1:2 ratio -> sum=3 -> 100/3 = 33 r 1 for part 0, 66 r 2 for part 1
      // Part 1 has the larger fractional remainder (2 > 1), so Part 1 gets +1 paisa
      const parts = Money.allocate(100n, [1, 2]);
      expect(parts).toEqual([33n, 67n]);
      expect(parts[0]! + parts[1]!).toBe(100n);
    });

    it('handles negative amounts correctly', () => {
      const parts = Money.allocate(-100n, [1, 1]);
      expect(parts).toEqual([-50n, -50n]);
      expect(parts[0]! + parts[1]!).toBe(-100n);
    });

    it('throws error when ratios are empty or sum to zero', () => {
      expect(() => Money.allocate(100n, [])).toThrow();
      expect(() => Money.allocate(100n, [0, 0])).toThrow();
    });
  });

  describe('Property-based tests with fast-check', () => {
    it('parts always sum to the whole for any random amount and ratios', () => {
      fc.assert(
        fc.property(
          fc.bigInt({ min: -1000000000n, max: 1000000000n }),
          fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 1, maxLength: 20 }),
          (amount, ratios) => {
            const parts = Money.allocate(amount, ratios);
            const sum = parts.reduce((acc, part) => acc + part, 0n);
            return sum === amount;
          },
        ),
        { numRuns: 200 },
      );
    });

    it('satisfies inverse addition and subtraction properties', () => {
      fc.assert(
        fc.property(
          fc.bigInt({ min: -1000000000n, max: 1000000000n }),
          fc.bigInt({ min: -1000000000n, max: 1000000000n }),
          (a, b) => {
            return Money.subtract(Money.add(a, b), b) === a;
          },
        ),
        { numRuns: 200 },
      );
    });
  });
});
