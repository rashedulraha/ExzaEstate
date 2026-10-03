/**
 * area.ts — Pure Bangladeshi Land Area Conversion Engine
 * Defined in architecture.md §9.1, §11 and prd.md §10, §17
 *
 * Enforces exact rational arithmetic to eliminate floating-point inaccuracies
 * (e.g., 3 * 435.6 !== 1306.8 in IEEE-754 floats).
 * Stores canonically in square feet (Decimal(18,4)).
 */

export const LAND_UNITS = {
  SQFT: 'SQFT',
  KATHA: 'KATHA',
  BIGHA: 'BIGHA',
  DECIMAL: 'DECIMAL',
  SHOTOK: 'DECIMAL',
  ACRE: 'ACRE',
} as const;

export type LandUnit =
  | 'SQFT'
  | 'KATHA'
  | 'BIGHA'
  | 'DECIMAL'
  | 'SHOTOK'
  | 'ACRE'
  | 'sqft'
  | 'katha'
  | 'bigha'
  | 'decimal'
  | 'shotok'
  | 'acre';

export interface LandUnitFactors {
  sqft?: number | string;
  katha?: number | string;
  bigha?: number | string;
  decimal?: number | string;
  shotok?: number | string;
  acre?: number | string;
  [key: string]: number | string | undefined;
}

export const DEFAULT_LAND_UNIT_FACTORS: Record<string, string> = {
  sqft: '1',
  katha: '720',
  bigha: '14400',
  decimal: '435.6',
  shotok: '435.6',
  acre: '43560',
};

interface Fraction {
  numerator: bigint;
  denominator: bigint;
}

function normalizeUnit(unit: string): string {
  const upper = unit.trim().toUpperCase();
  if (upper === 'SHOTOK') return 'DECIMAL';
  return upper;
}

export function parseFraction(value: number | string | bigint): Fraction {
  if (typeof value === 'bigint') {
    return { numerator: value, denominator: 1n };
  }

  const str = typeof value === 'number' ? value.toString() : value.trim();
  if (!str) {
    throw new TypeError('Area value cannot be empty');
  }

  const isNegative = str.startsWith('-');
  const clean = isNegative ? str.slice(1) : str;
  const [intPart = '0', decPart = ''] = clean.split('.');

  const denominator = 10n ** BigInt(decPart.length);
  const numerator = BigInt(intPart) * denominator + BigInt(decPart || '0');

  return {
    numerator: isNegative ? -numerator : numerator,
    denominator,
  };
}

function findCustomFactor(
  lower: string,
  unit: LandUnit,
  factors?: LandUnitFactors,
): number | string | undefined {
  if (!factors) return undefined;
  const direct = factors[lower] ?? factors[unit];
  if (direct !== undefined) return direct;
  for (const [key, val] of Object.entries(factors)) {
    if (key.toLowerCase() === lower && val !== undefined) return val;
  }
  return undefined;
}

function getFactorFraction(unit: LandUnit, factors?: LandUnitFactors): Fraction {
  const norm = normalizeUnit(unit);
  if (norm === 'SQFT') {
    return { numerator: 1n, denominator: 1n };
  }

  const lower = norm.toLowerCase();
  const factorVal = findCustomFactor(lower, unit, factors) ?? DEFAULT_LAND_UNIT_FACTORS[lower];

  if (factorVal === undefined) {
    throw new Error(`Unsupported land unit or missing factor for: ${unit}`);
  }

  return parseFraction(factorVal);
}

function fractionToDecimalString(frac: Fraction, precision: number = 4): string {
  const isNegative =
    (frac.numerator < 0n && frac.denominator > 0n) ||
    (frac.numerator > 0n && frac.denominator < 0n);

  const absNum = frac.numerator < 0n ? -frac.numerator : frac.numerator;
  const absDen = frac.denominator < 0n ? -frac.denominator : frac.denominator;

  const scale = 10n ** BigInt(precision);
  const scaled = absNum * scale * 10n;
  const unrounded = scaled / absDen;
  const quotient = unrounded / 10n;
  const lastDigit = unrounded % 10n;

  const rounded = lastDigit >= 5n ? quotient + 1n : quotient;

  const intPart = rounded / scale;
  const decPart = (rounded % scale).toString().padStart(precision, '0');

  const formatted = precision > 0 ? `${intPart}.${decPart}` : intPart.toString();
  return isNegative ? `-${formatted}` : formatted;
}

export function toCanonicalSqFt(
  value: number | string | bigint,
  unit: LandUnit,
  factors?: LandUnitFactors,
): string {
  const valFrac = parseFraction(value);
  const factorFrac = getFactorFraction(unit, factors);

  const productFrac: Fraction = {
    numerator: valFrac.numerator * factorFrac.numerator,
    denominator: valFrac.denominator * factorFrac.denominator,
  };

  return fractionToDecimalString(productFrac, 4);
}

export function fromCanonicalSqFt(
  sqft: number | string | bigint,
  targetUnit: LandUnit,
  factors?: LandUnitFactors,
  precision: number = 4,
): string {
  const sqftFrac = parseFraction(sqft);
  const factorFrac = getFactorFraction(targetUnit, factors);

  const resultFrac: Fraction = {
    numerator: sqftFrac.numerator * factorFrac.denominator,
    denominator: sqftFrac.denominator * factorFrac.numerator,
  };

  return fractionToDecimalString(resultFrac, precision);
}

export function convertArea(
  value: number | string | bigint,
  fromUnit: LandUnit,
  toUnitOrFactors?: LandUnit | LandUnitFactors,
  factors?: LandUnitFactors,
): string {
  let toUnit: LandUnit = 'SQFT';
  let effectiveFactors: LandUnitFactors | undefined;

  if (typeof toUnitOrFactors === 'string') {
    toUnit = toUnitOrFactors;
    effectiveFactors = factors;
  } else if (typeof toUnitOrFactors === 'object' && toUnitOrFactors !== null) {
    effectiveFactors = toUnitOrFactors;
    toUnit = 'SQFT';
  } else {
    effectiveFactors = factors;
  }

  const sqft = toCanonicalSqFt(value, fromUnit, effectiveFactors);
  if (normalizeUnit(toUnit) === 'SQFT') {
    return sqft;
  }
  return fromCanonicalSqFt(sqft, toUnit, effectiveFactors);
}

export function convertCompoundArea(
  parts: Array<{ value: number | string | bigint; unit: LandUnit }>,
  factors?: LandUnitFactors,
): string {
  let totalNumerator = 0n;
  let commonDenominator = 1n;

  for (const part of parts) {
    const valFrac = parseFraction(part.value);
    const factorFrac = getFactorFraction(part.unit, factors);

    const partNum = valFrac.numerator * factorFrac.numerator;
    const partDen = valFrac.denominator * factorFrac.denominator;

    totalNumerator = totalNumerator * partDen + partNum * commonDenominator;
    commonDenominator = commonDenominator * partDen;
  }

  return fractionToDecimalString({ numerator: totalNumerator, denominator: commonDenominator }, 4);
}

export function breakdownArea(
  sqft: number | string | bigint,
  primaryUnit: LandUnit,
  remainderUnit: LandUnit,
  factors?: LandUnitFactors,
): { primary: string; remainder: string } {
  const sqftFrac = parseFraction(sqft);
  const primaryFactor = getFactorFraction(primaryUnit, factors);
  const remainderFactor = getFactorFraction(remainderUnit, factors);

  const primaryWholeFracNum = sqftFrac.numerator * primaryFactor.denominator;
  const primaryWholeFracDen = sqftFrac.denominator * primaryFactor.numerator;
  const primaryUnits = primaryWholeFracNum / primaryWholeFracDen;

  const usedSqftNum = primaryUnits * primaryFactor.numerator * sqftFrac.denominator;
  const remSqftNum = sqftFrac.numerator * primaryFactor.denominator - usedSqftNum;
  const remSqftDen = sqftFrac.denominator * primaryFactor.denominator;

  const remUnitNum = remSqftNum * remainderFactor.denominator;
  const remUnitDen = remSqftDen * remainderFactor.numerator;

  const remainderStr = fractionToDecimalString(
    { numerator: remUnitNum, denominator: remUnitDen },
    4,
  );

  const cleanRemainder = remainderStr.replace(/\.?0+$/, '') || '0';

  return {
    primary: primaryUnits.toString(),
    remainder: cleanRemainder,
  };
}
