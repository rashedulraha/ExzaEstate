/**
 * Helper utilities for LocalCompanyForm
 */

const STOP_WORDS = new Set([
  'LTD',
  'LIMITED',
  'INC',
  'INCORPORATED',
  'CORP',
  'CORPORATION',
  'PVT',
  'PRIVATE',
  'CO',
  'COMPANY',
  'HOLDINGS',
  'HOLDING',
  'GROUP',
  'DEVELOPMENT',
  'DEVELOPMENTS',
  'PROPERTIES',
  'PROPERTY',
  'REAL',
  'ESTATE',
]);

function extractWords(name: string): string[] {
  return (name || '')
    .replace(/[^A-Za-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function buildCandidates(words: string[]): string[] {
  const meaningfulWords = words.filter((w) => !STOP_WORDS.has(w.toUpperCase()));
  const primaryWord = meaningfulWords[0] || words[0] || 'EXZA';
  const acronym = words
    .map((w) => w[0] || '')
    .join('')
    .toUpperCase();
  const meaningfulAcronym = meaningfulWords
    .map((w) => w[0] || '')
    .join('')
    .toUpperCase();

  const candidates: string[] = [];
  if (primaryWord.length >= 2) {
    candidates.push(primaryWord.slice(0, 8).toUpperCase());
  }
  if (meaningfulAcronym.length >= 2) {
    candidates.push(meaningfulAcronym.slice(0, 8));
  }
  if (acronym.length >= 2) {
    candidates.push(acronym.slice(0, 8));
  }
  candidates.push(`${primaryWord.slice(0, 4).toUpperCase()}01`.slice(0, 8));

  return Array.from(new Set(candidates.filter((c) => c.length >= 2)));
}

/**
 * Generates an uppercase, alphanumeric company code (2-10 characters)
 * from an organization's legal name.
 * Cycles through clean candidates if called with incrementing variant.
 */
export function generateCompanyCode(name: string, variant = 0): string {
  const words = extractWords(name);
  if (words.length === 0) {
    return 'EXZA';
  }

  const list = buildCandidates(words);
  if (list.length === 0) {
    return 'EXZA';
  }

  const selectedIndex = Math.abs(variant) % list.length;
  return list[selectedIndex] || list[0] || 'EXZA';
}

const UPPERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWERS = 'abcdefghijkmnpqrstuvwxyz';
const DIGITS = '23456789';
const SYMBOLS = '!@#$%*';
const ALL_CHARS = UPPERS + LOWERS + DIGITS + SYMBOLS;

/**
 * Generates a strong, random password (12 characters by default)
 * containing uppercase, lowercase, numbers, and symbols.
 */
export function generateStrongPassword(length = 12): string {
  const chars = [
    UPPERS[Math.floor(Math.random() * UPPERS.length)] || 'A',
    LOWERS[Math.floor(Math.random() * LOWERS.length)] || 'a',
    DIGITS[Math.floor(Math.random() * DIGITS.length)] || '7',
    SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)] || '#',
  ];

  while (chars.length < length) {
    const idx = Math.floor(Math.random() * ALL_CHARS.length);
    chars.push(ALL_CHARS[idx] || 'x');
  }

  return chars.sort(() => Math.random() - 0.5).join('');
}
