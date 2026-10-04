import { describe, it, expect } from 'vitest';
import { amountToWords, formatArea, formatDate, formatMoney, formatNumber } from './format.js';
import { t } from './i18n/t.js';

describe('Formatters & Localisation (S3)', () => {
  describe('formatMoney (AT-19)', () => {
    it('satisfies acceptance test AT-19: formatMoney(50000000n) returns ৳5,00,000.00', () => {
      expect(formatMoney(50000000n)).toBe('৳5,00,000.00');
    });

    it('formats large crore amounts with Bangladeshi grouping', () => {
      expect(formatMoney(15000000000n)).toBe('৳15,00,00,000.00');
    });

    it('formats small amounts and fractional paisa', () => {
      expect(formatMoney(1234567n)).toBe('৳12,345.67');
      expect(formatMoney(50n)).toBe('৳0.50');
      expect(formatMoney(0n)).toBe('৳0.00');
    });

    it('formats negative amounts with leading minus', () => {
      expect(formatMoney(-50000000n)).toBe('-৳5,00,000.00');
    });

    it('supports hiding currency symbol', () => {
      expect(formatMoney(50000000n, { showCurrency: false })).toBe('5,00,000.00');
    });
  });

  describe('formatNumber', () => {
    it('formats integer and decimal numbers with lakh/crore grouping', () => {
      expect(formatNumber(500000)).toBe('5,00,000');
      expect(formatNumber(150000000)).toBe('15,00,00,000');
      expect(formatNumber(1234567.89, { minimumFractionDigits: 2 })).toBe('12,34,567.89');
    });
  });

  describe('formatArea', () => {
    it('formats area in sqft by default', () => {
      expect(formatArea(720)).toBe('720.00 sq ft');
    });

    it('converts and formats area in katha, bigha, and shotok', () => {
      expect(formatArea(720, 'katha')).toBe('1.00 katha');
      expect(formatArea(14400, 'bigha')).toBe('1.00 bigha');
      expect(formatArea(435.6, 'shotok')).toBe('1.00 shotok');
    });
  });

  describe('formatDate (Asia/Dhaka)', () => {
    it('formats calendar date YYYY-MM-DD correctly without UTC shift', () => {
      expect(formatDate('2026-10-03')).toBe('03 Oct 2026');
      expect(formatDate('2026-10-03', 'Asia/Dhaka', 'yyyy-MM-dd')).toBe('2026-10-03');
    });
  });

  describe('i18n translation t()', () => {
    it('translates existing keys from en.json', () => {
      expect(t('app.name')).toBe('ExzaEstate');
    });

    it('interpolates parameters correctly', () => {
      expect(t('greeting', { name: 'Rahim' })).toBe('Hello Rahim');
    });

    it('falls back to key when missing', () => {
      expect(t('non.existent.key')).toBe('non.existent.key');
    });
  });

  describe('amountToWords', () => {
    it('converts crore and lakh amounts correctly into words', () => {
      expect(amountToWords(500000000n)).toBe('Fifty Lakh Taka Only');
      expect(amountToWords(1500000000n)).toBe('One Crore Fifty Lakh Taka Only');
      expect(amountToWords(50000000n)).toBe('Five Lakh Taka Only');
      expect(amountToWords(1000000n)).toBe('Ten Thousand Taka Only');
      expect(amountToWords(0n)).toBe('Zero Taka Only');
    });

    it('converts fractional paisa amounts', () => {
      expect(amountToWords(50000050n)).toBe('Five Lakh Taka and Fifty Paisa Only');
      expect(amountToWords(50n)).toBe('Fifty Paisa Only');
    });

    it('converts crore, lakh, thousand, and paisa into Bengali words (S4 & AT-39)', () => {
      expect(amountToWords(500000000n, 'bn')).toBe('পঞ্চাশ লক্ষ টাকা মাত্র');
      expect(amountToWords(1500000000n, 'bn')).toBe('এক কোটি পঞ্চাশ লক্ষ টাকা মাত্র');
      expect(amountToWords(50000000n, 'bn')).toBe('পাঁচ লক্ষ টাকা মাত্র');
      expect(amountToWords(1000000n, 'bn')).toBe('দশ হাজার টাকা মাত্র');
      expect(amountToWords(50000050n, 'bn')).toBe('পাঁচ লক্ষ টাকা এবং পঞ্চাশ পয়সা মাত্র');
      expect(amountToWords(50n, 'bn')).toBe('পঞ্চাশ পয়সা মাত্র');
      expect(amountToWords(0n, 'bn')).toBe('শূন্য টাকা মাত্র');
    });
  });
});
