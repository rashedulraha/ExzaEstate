/**
 * property-pricing.ts — Pure Domain Calculation for Property Pricing
 *
 * Implements price breakdown calculation:
 *   base + premium - discount + charges = net
 * Defined in prd.md MOD-PROPERTY, §9.2, MOD-QUOTATION, MOD-DISCOUNT
 * and architecture.md §9.1 (ARCH-MONEY)
 */

import { Money } from '@exzaestate/shared';

export interface PropertyPricingItem {
  code: string;
  name: string;
  amountPaisa: bigint;
}

export interface CalculatePricingInput {
  basePricePaisa: bigint;
  premiumPaisa?: bigint;
  discountPaisa?: bigint;
  discountPct?: number | string;
  charges?: PropertyPricingItem[];
  discountLimitPct?: number | string | null;
}

export interface PropertyPricingBreakdown {
  basePricePaisa: bigint;
  premiumPaisa: bigint;
  grossPricePaisa: bigint;
  discountPaisa: bigint;
  discountPct: number;
  chargesTotalPaisa: bigint;
  charges: PropertyPricingItem[];
  netPricePaisa: bigint;
  discountLimitPct: number | null;
  isWithinDiscountLimit: boolean;
}

/**
 * Validates non-negativity of monetary inputs.
 */
function validateMonetaryInputs(
  basePricePaisa: bigint,
  premiumPaisa: bigint,
  charges: PropertyPricingItem[],
): void {
  if (basePricePaisa < 0n) {
    throw new RangeError('Base price cannot be negative');
  }
  if (premiumPaisa < 0n) {
    throw new RangeError('Premium cannot be negative');
  }
  for (const c of charges) {
    if (c.amountPaisa < 0n) {
      throw new RangeError('Charge amounts cannot be negative');
    }
  }
}

/**
 * Resolves discount paisa and effective discount percentage.
 */
function resolveDiscount(
  grossPricePaisa: bigint,
  discountPaisaInput?: bigint,
  discountPctInput?: number | string,
): { discountPaisa: bigint; discountPct: number } {
  if (discountPaisaInput !== undefined) {
    if (discountPaisaInput < 0n) {
      throw new RangeError('Discount cannot be negative');
    }
    if (discountPaisaInput > grossPricePaisa) {
      throw new RangeError('Discount cannot exceed gross price');
    }
    const discountPct =
      grossPricePaisa > 0n ? Number((discountPaisaInput * 10_000n) / grossPricePaisa) / 100 : 0;
    return { discountPaisa: discountPaisaInput, discountPct };
  }

  if (discountPctInput !== undefined) {
    const rateNum =
      typeof discountPctInput === 'number' ? discountPctInput : Number(discountPctInput);
    if (Number.isNaN(rateNum) || rateNum < 0) {
      throw new RangeError('Discount percentage cannot be negative');
    }
    const rateStr = (rateNum / 100).toFixed(6);
    const discountPaisa = Money.multiplyByRate(grossPricePaisa, rateStr);
    if (discountPaisa > grossPricePaisa) {
      throw new RangeError('Discount cannot exceed gross price');
    }
    return { discountPaisa, discountPct: rateNum };
  }

  return { discountPaisa: 0n, discountPct: 0 };
}

/**
 * Validates if discount percentage is within allowable property limit.
 */
export function validateDiscountLimit(discountPct: number, discountLimitPct: number): boolean {
  return discountPct <= discountLimitPct;
}

/**
 * Calculates net price from individual components:
 * base + premium - discount + charges = net
 */
export function calculateNetPrice(
  basePricePaisa: bigint,
  premiumPaisa: bigint = 0n,
  discountPaisa: bigint = 0n,
  chargesTotalPaisa: bigint = 0n,
): bigint {
  if (basePricePaisa < 0n) {
    throw new RangeError('Base price cannot be negative');
  }
  if (premiumPaisa < 0n) {
    throw new RangeError('Premium cannot be negative');
  }
  if (discountPaisa < 0n) {
    throw new RangeError('Discount cannot be negative');
  }
  if (chargesTotalPaisa < 0n) {
    throw new RangeError('Charges cannot be negative');
  }

  const grossPrice = Money.add(basePricePaisa, premiumPaisa);
  if (discountPaisa > grossPrice) {
    throw new RangeError('Discount cannot exceed gross price');
  }

  const afterDiscount = Money.subtract(grossPrice, discountPaisa);
  return Money.add(afterDiscount, chargesTotalPaisa);
}

/**
 * Calculates full property pricing breakdown with itemised charges and discount limit check.
 */
export function calculatePricingBreakdown(input: CalculatePricingInput): PropertyPricingBreakdown {
  const basePricePaisa = input.basePricePaisa;
  const premiumPaisa = input.premiumPaisa ?? 0n;
  const charges = input.charges ?? [];

  validateMonetaryInputs(basePricePaisa, premiumPaisa, charges);

  const grossPricePaisa = Money.add(basePricePaisa, premiumPaisa);
  const { discountPaisa, discountPct } = resolveDiscount(
    grossPricePaisa,
    input.discountPaisa,
    input.discountPct,
  );

  const chargesTotalPaisa = charges.reduce((acc, c) => Money.add(acc, c.amountPaisa), 0n);
  const netPricePaisa = calculateNetPrice(
    basePricePaisa,
    premiumPaisa,
    discountPaisa,
    chargesTotalPaisa,
  );

  const discountLimitPct =
    input.discountLimitPct !== undefined && input.discountLimitPct !== null
      ? Number(input.discountLimitPct)
      : null;

  const isWithinDiscountLimit =
    discountLimitPct === null || validateDiscountLimit(discountPct, discountLimitPct);

  return {
    basePricePaisa,
    premiumPaisa,
    grossPricePaisa,
    discountPaisa,
    discountPct,
    chargesTotalPaisa,
    charges,
    netPricePaisa,
    discountLimitPct,
    isWithinDiscountLimit,
  };
}
