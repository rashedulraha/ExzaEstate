/**
 * format.ts — Bangladeshi Localisation & Formatting Utilities
 * Defined in architecture.md §9.1, §11, design.md §3.1, and prd.md §10
 */

import { format as dateFnsFormat } from 'date-fns';
import { TZDate } from '@date-fns/tz';

export interface FormatMoneyOptions {
  showCurrency?: boolean;
}

/**
 * Formats an integer string into Indian/Bangladeshi numbering system (lakh/crore grouping).
 * Examples:
 *   500000 -> 5,00,000
 *   150000000 -> 15,00,00,000
 */
export function formatBangladeshiGrouping(intStr: string): string {
  if (intStr.length <= 3) {
    return intStr;
  }
  const last3 = intStr.slice(-3);
  const rest = intStr.slice(0, -3);

  const groups: string[] = [];
  let i = rest.length;
  while (i > 0) {
    const start = Math.max(0, i - 2);
    groups.unshift(rest.slice(start, i));
    i -= 2;
  }

  return groups.join(',') + ',' + last3;
}

/**
 * Formats a BigInt paisa amount into Bangladeshi currency representation.
 * Groups by lakh/crore, uses English digits, and prefixes with '৳'.
 *
 * Example:
 *   formatMoney(50000000n) -> "৳5,00,000.00" (Acceptance AT-19)
 *   formatMoney(-50000000n) -> "-৳5,00,000.00"
 */
export function formatMoney(
  paisa: bigint | number | string,
  options: FormatMoneyOptions = {},
): string {
  const { showCurrency = true } = options;

  let bigPaisa: bigint;
  if (typeof paisa === 'bigint') {
    bigPaisa = paisa;
  } else if (typeof paisa === 'number') {
    bigPaisa = BigInt(Math.round(paisa));
  } else {
    bigPaisa = BigInt(paisa.trim());
  }

  const isNegative = bigPaisa < 0n;
  const absPaisa = isNegative ? -bigPaisa : bigPaisa;

  const taka = absPaisa / 100n;
  const poisha = absPaisa % 100n;

  const formattedTaka = formatBangladeshiGrouping(taka.toString());
  const formattedPoisha = poisha.toString().padStart(2, '0');

  const numberPart = `${formattedTaka}.${formattedPoisha}`;

  if (isNegative) {
    return showCurrency ? `-৳${numberPart}` : `-${numberPart}`;
  }
  return showCurrency ? `৳${numberPart}` : numberPart;
}

export interface FormatNumberOptions {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

function toCleanNumberString(value: number | bigint | string): {
  cleanStr: string;
  isNegative: boolean;
} {
  const str = typeof value === 'string' ? value.trim() : value.toString();
  const isNegative = str.startsWith('-');
  return { cleanStr: isNegative ? str.slice(1) : str, isNegative };
}

function formatDecimals(decimalPart: string, minDigits: number, maxDigits: number): string {
  if (maxDigits <= 0) {
    return '';
  }
  if (decimalPart.length > maxDigits) {
    const factor = 10 ** maxDigits;
    const rounded = Math.round(Number(`0.${decimalPart}`) * factor) / factor;
    const roundedStr = rounded.toString().split('.')[1] || '';
    return roundedStr.padEnd(minDigits, '0');
  }
  return decimalPart.padEnd(minDigits, '0');
}

/**
 * Formats numbers with Bangladeshi lakh/crore digit grouping.
 */
export function formatNumber(
  value: number | bigint | string,
  options: FormatNumberOptions = {},
): string {
  const { minimumFractionDigits = 0, maximumFractionDigits = 2 } = options;
  const { cleanStr, isNegative } = toCleanNumberString(value);
  const [integerPart = '0', rawDecimal = ''] = cleanStr.split('.');

  const formattedInteger = formatBangladeshiGrouping(integerPart);
  const formattedDecimal = formatDecimals(rawDecimal, minimumFractionDigits, maximumFractionDigits);

  const formatted =
    formattedDecimal.length > 0 ? `${formattedInteger}.${formattedDecimal}` : formattedInteger;

  return isNegative ? `-${formatted}` : formatted;
}

export type AreaUnit = 'sqft' | 'katha' | 'bigha' | 'shotok';

const DEFAULT_AREA_FACTORS: Record<AreaUnit, number> = {
  sqft: 1,
  katha: 720,
  bigha: 14400,
  shotok: 435.6,
};

const AREA_UNIT_LABELS: Record<AreaUnit, string> = {
  sqft: 'sq ft',
  katha: 'katha',
  bigha: 'bigha',
  shotok: 'shotok',
};

/**
 * Formats land area with Bangladeshi unit conversions (katha, bigha, shotok, sq ft).
 */
export function formatArea(
  sqft: number | bigint | string,
  unit: AreaUnit = 'sqft',
  customFactors?: Partial<Record<AreaUnit, number>>,
): string {
  const numericSqft = Number(sqft);
  const factor = customFactors?.[unit] ?? DEFAULT_AREA_FACTORS[unit] ?? 1;
  const converted = numericSqft / factor;
  const unitLabel = AREA_UNIT_LABELS[unit] ?? unit;

  return `${formatNumber(converted, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${unitLabel}`;
}

/**
 * Formats a calendar date or timestamp in Asia/Dhaka timezone.
 * Calendar dates (YYYY-MM-DD) do NOT pass through UTC to avoid off-by-one errors.
 */
export function formatDate(
  date: Date | string | number,
  timezone: string = 'Asia/Dhaka',
  formatPattern: string = 'dd MMM yyyy',
): string {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
    const [year, month, day] = date.trim().split('-').map(Number);
    const tzDate = new TZDate(year!, month! - 1, day!, timezone);
    return dateFnsFormat(tzDate, formatPattern);
  }

  const dateObj = date instanceof Date ? date : new Date(date);
  const tzDate = new TZDate(dateObj, timezone);
  return dateFnsFormat(tzDate, formatPattern);
}

/**
 * Returns today's business date (YYYY-MM-DD) in the specified company timezone.
 * Defaults to 'Asia/Dhaka' per architecture.md §11.
 */
export function getTodayBusinessDate(timezone: string = 'Asia/Dhaka'): string {
  const tzDate = new TZDate(new Date(), timezone);
  return dateFnsFormat(tzDate, 'yyyy-MM-dd');
}

/**
 * Checks whether a business date (YYYY-MM-DD or Date) is strictly before today in the specified timezone.
 */
export function isOverdueBusinessDate(
  dueDate: Date | string,
  timezone: string = 'Asia/Dhaka',
): boolean {
  const todayStr = getTodayBusinessDate(timezone);
  let dueStr: string;
  if (typeof dueDate === 'string') {
    dueStr = dueDate.slice(0, 10);
  } else {
    dueStr = dateFnsFormat(new TZDate(dueDate, timezone), 'yyyy-MM-dd');
  }
  return dueStr < todayStr;
}
