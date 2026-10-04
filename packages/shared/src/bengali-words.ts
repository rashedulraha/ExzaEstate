const BN_NUMBERS_0_TO_99: string[] = [
  'শূন্য', 'এক', 'দুই', 'তিন', 'চার', 'পাঁচ', 'ছয়', 'সাত', 'আট', 'নয়', 'দশ',
  'এগারো', 'বারো', 'তেরো', 'চৌদ্দ', 'পনেরো', 'ষোল', 'সতেরো', 'আঠারো', 'উনিশ', 'বিশ',
  'একুশ', 'বাইশ', 'তেইশ', 'চব্বিশ', 'পঁচিশ', 'ছাব্বিশ', 'সাতাশ', 'আঠাশ', 'ঊনত্রিশ', 'ত্রিশ',
  'একত্রিশ', 'বত্রিশ', 'তেত্রিশ', 'চৌত্রিশ', 'পঁয়ত্রিশ', 'ছত্রিশ', 'সাঁইত্রিশ', 'আটত্রিশ', 'ঊনচল্লিশ', 'চল্লিশ',
  'একচল্লিশ', 'বিয়াল্লিশ', 'তেতাল্লিশ', 'চুয়াল্লিশ', 'পঁয়তাল্লিশ', 'ছেচল্লিশ', 'সাতচল্লিশ', 'আটচল্লিশ', 'ঊনপঞ্চাশ', 'পঞ্চাশ',
  'একান্ন', 'বায়ান্ন', 'তিপ্পান্ন', 'চুয়ান্ন', 'পঞ্চান্ন', 'ছাপ্পান্ন', 'সাতান্ন', 'আটান্ন', 'ঊনষাট', 'ষাট',
  'একষট্টি', 'বাষট্টি', 'তেষট্টি', 'চৌষট্টি', 'পঁয়ষট্টি', 'ছেষট্টি', 'সাতষট্টি', 'আটষট্টি', 'ঊনসত্তর', 'সত্তর',
  'একাত্তর', 'বাহাত্তর', 'তিয়াত্তর', 'চুয়াত্তর', 'পঁচাত্তর', 'ছিয়াত্তর', 'সাতাত্তর', 'আটাত্তর', 'ঊনআশি', 'আশি',
  'একাশি', 'বিরাশি', 'তিরাশি', 'চুরাশি', 'পঁচাশি', 'ছিয়াশি', 'সাতাশি', 'আটাশি', 'ঊননব্বই', 'নব্বই',
  'একানব্বই', 'বিরানব্বই', 'তিরানব্বই', 'চুরানব্বই', 'পঁচানব্বই', 'ছিয়ানব্বই', 'সাতানব্বই', 'আটানব্বই', 'নিরানব্বই',
];

function convertBnBelowThousand(n: number): string {
  let str = '';
  if (n >= 100) {
    const hundreds = Math.floor(n / 100);
    const hundredWord = BN_NUMBERS_0_TO_99[hundreds] ?? '';
    str += `${hundredWord} শত `;
    n %= 100;
  }
  if (n > 0) {
    str += `${BN_NUMBERS_0_TO_99[n] ?? ''} `;
  }
  return str.trim();
}

export function convertTakaToBnWords(taka: bigint): string {
  if (taka === 0n) return 'শূন্য';
  let remaining = taka;
  const parts: string[] = [];

  const crore = remaining / 10000000n;
  if (crore > 0n) {
    parts.push(`${convertTakaToBnWords(crore)} কোটি`);
    remaining %= 10000000n;
  }

  const lakh = Number(remaining / 100000n);
  if (lakh > 0) {
    parts.push(`${convertBnBelowThousand(lakh)} লক্ষ`);
    remaining %= 100000n;
  }

  const thousand = Number(remaining / 1000n);
  if (thousand > 0) {
    parts.push(`${convertBnBelowThousand(thousand)} হাজার`);
    remaining %= 1000n;
  }

  const hundred = Number(remaining);
  if (hundred > 0) {
    parts.push(convertBnBelowThousand(hundred));
  }

  return parts.join(' ').trim();
}

/**
 * Converts BigInt paisa into Bangladeshi currency wording in Bengali.
 * Example: 500000000n -> "পঞ্চাশ লক্ষ টাকা মাত্র"
 */
export function amountToBnWords(paisa: bigint): string {
  const isNegative = paisa < 0n;
  const absPaisa = isNegative ? -paisa : paisa;
  const taka = absPaisa / 100n;
  const remPaisa = Number(absPaisa % 100n);

  const prefix = isNegative ? 'ঋণাত্মক ' : '';
  const takaWords = convertTakaToBnWords(taka);
  const paisaWords = remPaisa > 0 ? (BN_NUMBERS_0_TO_99[remPaisa] ?? '') : '';

  if (taka === 0n && remPaisa > 0) {
    return `${prefix}${paisaWords} পয়সা মাত্র`;
  }

  if (remPaisa > 0) {
    return `${prefix}${takaWords} টাকা এবং ${paisaWords} পয়সা মাত্র`;
  }

  return `${prefix}${takaWords} টাকা মাত্র`;
}
