/**
 * money.ts — BigInt Paisa Money Engine
 * Defined in architecture.md §9.1 and accounting-rules.md §5
 *
 * Rules:
 * - Integer paisa stored and manipulated as BigInt only.
 * - Rounding rule: round half away from zero (-0.5 -> -1, +0.5 -> +1).
 * - Allocation: largest-remainder algorithm with stable index tie-breaking.
 */

function parseFractionalPaisa(decimalPart: string): bigint {
  if (decimalPart.length === 0) {
    return 0n;
  }
  const twoDigits = decimalPart.padEnd(2, '0').slice(0, 2);
  let paisa = BigInt(twoDigits);
  if (decimalPart.length > 2 && (decimalPart[2] ?? '') >= '5') {
    paisa += 1n;
  }
  return paisa;
}

interface ParsedRate {
  numerator: bigint;
  denominator: bigint;
  isNegative: boolean;
}

function parseRateFraction(rate: string | number): ParsedRate {
  const rateStr = typeof rate === 'number' ? rate.toString() : rate.trim();
  if (!rateStr) {
    throw new TypeError('Rate cannot be empty');
  }

  const isNegative = rateStr.startsWith('-');
  const cleanRate = isNegative ? rateStr.slice(1) : rateStr;
  const [intPart = '0', decPart = ''] = cleanRate.split('.');

  const denominator = 10n ** BigInt(decPart.length);
  const numerator = BigInt(intPart) * denominator + BigInt(decPart || '0');

  return { numerator, denominator, isNegative };
}

function roundQuotientHalfAway(
  product: bigint,
  quotient: bigint,
  remainder: bigint,
  denominator: bigint,
): bigint {
  const absRemainder = remainder < 0n ? -remainder : remainder;
  if (absRemainder * 2n >= denominator) {
    return product >= 0n ? quotient + 1n : quotient - 1n;
  }
  return quotient;
}

export class Money {
  /**
   * Adds two paisa amounts.
   */
  static add(a: bigint, b: bigint): bigint {
    return a + b;
  }

  /**
   * Subtracts amount b from amount a.
   */
  static subtract(a: bigint, b: bigint): bigint {
    return a - b;
  }

  /**
   * Parses string amount from JSON API payload into BigInt paisa.
   */
  static fromApi(amountString: string): bigint {
    if (typeof amountString !== 'string' || amountString.trim() === '') {
      throw new TypeError(`Invalid money string: ${amountString}`);
    }
    return BigInt(amountString.trim());
  }

  /**
   * Converts a paisa value (bigint, number, or integer string) into BigInt paisa.
   */
  static fromPaisa(paisa: bigint | number | string): bigint {
    if (typeof paisa === 'bigint') {
      return paisa;
    }
    if (typeof paisa === 'number') {
      if (!Number.isInteger(paisa)) {
        throw new TypeError(`Paisa must be an integer, received: ${paisa}`);
      }
      return BigInt(paisa);
    }
    if (typeof paisa === 'string') {
      return BigInt(paisa.trim());
    }
    throw new TypeError(`Invalid paisa input: ${paisa}`);
  }

  /**
   * Converts Taka amount (e.g., "500.25", 500.25) to integer paisa BigInt.
   * Handles decimal conversion without binary floating-point errors.
   */
  static toPaisa(takaAmount: string | number): bigint {
    const str = typeof takaAmount === 'number' ? takaAmount.toString() : takaAmount.trim();
    if (!str) {
      throw new TypeError('Taka amount cannot be empty');
    }

    const isNegative = str.startsWith('-');
    const cleanStr = isNegative ? str.slice(1) : str;
    const [integerPart = '0', decimalPart = ''] = cleanStr.split('.');

    const paisa = BigInt(integerPart) * 100n + parseFractionalPaisa(decimalPart);
    return isNegative ? -paisa : paisa;
  }

  /**
   * Multiplies a paisa amount by a rate string or number (e.g. '0.15' or 0.05).
   * Uses exact BigInt fractions and rounds half away from zero.
   */
  static multiplyByRate(amount: bigint, rate: string | number): bigint {
    const { numerator, denominator, isNegative } = parseRateFraction(rate);
    const product = isNegative ? -(amount * numerator) : amount * numerator;

    const quotient = product / denominator;
    const remainder = product % denominator;

    return roundQuotientHalfAway(product, quotient, remainder, denominator);
  }

  /**
   * Allocates an amount across parts according to the largest-remainder algorithm.
   * Ensures that the sum of allocated parts strictly equals the initial amount.
   *
   * @param amount The total paisa amount to allocate
   * @param ratios Array of positive ratios/weights
   */
  static allocate(amount: bigint, ratios: (number | bigint)[]): bigint[] {
    if (!ratios || ratios.length === 0) {
      throw new Error('Ratios array cannot be empty');
    }

    const bigRatios = ratios.map((r) => {
      const val = typeof r === 'bigint' ? r : BigInt(r);
      if (val < 0n) {
        throw new Error('Ratios must be non-negative');
      }
      return val;
    });

    const totalRatio = bigRatios.reduce((acc, r) => acc + r, 0n);
    if (totalRatio <= 0n) {
      throw new Error('Ratios must sum to greater than zero');
    }

    if (amount === 0n) {
      return bigRatios.map(() => 0n);
    }

    const isNegative = amount < 0n;
    const absAmount = isNegative ? -amount : amount;

    const quotients: bigint[] = [];
    const remainders: { index: number; remainder: bigint }[] = [];

    let totalAllocated = 0n;

    for (let i = 0; i < bigRatios.length; i++) {
      const ratio = bigRatios[i]!;
      const product = absAmount * ratio;
      const q = product / totalRatio;
      const rem = product % totalRatio;

      quotients.push(q);
      remainders.push({ index: i, remainder: rem });
      totalAllocated += q;
    }

    let leftover = absAmount - totalAllocated;

    // Sort by remainder descending; tie-break by earliest original index
    remainders.sort((a, b) => {
      if (b.remainder > a.remainder) return 1;
      if (b.remainder < a.remainder) return -1;
      return a.index - b.index;
    });

    for (let i = 0; i < remainders.length && leftover > 0n; i++) {
      const targetIndex = remainders[i]!.index;
      quotients[targetIndex] = quotients[targetIndex]! + 1n;
      leftover -= 1n;
    }

    return quotients.map((q) => (isNegative ? -q : q));
  }
}
