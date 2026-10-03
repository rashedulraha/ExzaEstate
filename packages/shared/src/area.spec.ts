import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LAND_UNIT_FACTORS,
  breakdownArea,
  convertArea,
  convertCompoundArea,
  fromCanonicalSqFt,
  toCanonicalSqFt,
} from './area.js';

describe('Bangladeshi Area Conversion Engine (Task A1.3 - S1)', () => {
  it('converts Katha to canonical sq ft (1 Katha = 720 sq ft)', () => {
    expect(toCanonicalSqFt(1, 'KATHA')).toBe('720.0000');
    expect(toCanonicalSqFt('5', 'KATHA')).toBe('3600.0000');
    expect(toCanonicalSqFt('2.5', 'KATHA')).toBe('1800.0000');
  });

  it('converts Decimal to canonical sq ft (1 Decimal = 435.6 sq ft) without float error', () => {
    expect(toCanonicalSqFt(1, 'DECIMAL')).toBe('435.6000');
    // Note: In IEEE-754 float, 3 * 435.6 is 1306.8000000000002.
    // Our exact rational engine must produce exactly 1306.8000!
    expect(toCanonicalSqFt(3, 'DECIMAL')).toBe('1306.8000');
    expect(toCanonicalSqFt('10', 'DECIMAL')).toBe('4356.0000');
  });

  it('converts Bigha to canonical sq ft (1 Bigha = 14400 sq ft)', () => {
    expect(toCanonicalSqFt(1, 'BIGHA')).toBe('14400.0000');
    expect(toCanonicalSqFt(2, 'BIGHA')).toBe('28800.0000');
  });

  it('converts Acre to canonical sq ft (1 Acre = 43560 sq ft)', () => {
    expect(toCanonicalSqFt(1, 'ACRE')).toBe('43560.0000');
    expect(toCanonicalSqFt('0.5', 'ACRE')).toBe('21780.0000');
  });

  it('supports SHOTOK alias as DECIMAL', () => {
    expect(toCanonicalSqFt(3, 'SHOTOK')).toBe('1306.8000');
    expect(toCanonicalSqFt(3, 'shotok')).toBe('1306.8000');
  });

  it('satisfies Acceptance AT-27: 5 Katha + 3 Decimal stores 3600 + 1306.8 sq ft', () => {
    const kathaSqft = toCanonicalSqFt(5, 'KATHA');
    const decimalSqft = toCanonicalSqFt(3, 'DECIMAL');

    expect(kathaSqft).toBe('3600.0000');
    expect(decimalSqft).toBe('1306.8000');

    const totalSqft = convertCompoundArea([
      { value: 5, unit: 'KATHA' },
      { value: 3, unit: 'DECIMAL' },
    ]);

    expect(totalSqft).toBe('4906.8000');

    // Display converts back correctly
    expect(fromCanonicalSqFt(kathaSqft, 'KATHA')).toBe('5.0000');
    expect(fromCanonicalSqFt(decimalSqft, 'DECIMAL')).toBe('3.0000');
    expect(fromCanonicalSqFt(totalSqft, 'KATHA')).toBe('6.8150');
    expect(fromCanonicalSqFt(totalSqft, 'DECIMAL')).toBe('11.2645');
  });

  it('breakdownArea breaks down compound units cleanly (e.g. 5 Bigha and 3 Katha)', () => {
    // 5 Bigha = 72000 sq ft, 3 Katha = 2160 sq ft -> total 74160 sq ft
    const breakdown = breakdownArea('74160.0000', 'BIGHA', 'KATHA');
    expect(breakdown.primary).toBe('5');
    expect(breakdown.remainder).toBe('3');
  });

  it('supports custom company factors override (e.g. Northern district Bigha)', () => {
    const customFactors = {
      ...DEFAULT_LAND_UNIT_FACTORS,
      bigha: '14374.8', // 33 Decimal in certain northern districts
    };

    expect(toCanonicalSqFt(1, 'BIGHA', customFactors)).toBe('14374.8000');
    expect(toCanonicalSqFt(2, 'BIGHA', customFactors)).toBe('28749.6000');
  });

  it('converts between units using convertArea', () => {
    // 1 Acre = 43560 sq ft / 720 sq ft = 60.5 Katha
    const kathaInAcre = convertArea(1, 'ACRE', 'KATHA');
    expect(kathaInAcre).toBe('60.5000');

    // 20 Katha = 1 Bigha
    const bighaIn20Katha = convertArea(20, 'KATHA', 'BIGHA');
    expect(bighaIn20Katha).toBe('1.0000');

    // 3-arg call converts to SQFT
    expect(convertArea(5, 'KATHA')).toBe('3600.0000');
  });

  it('converts canonical sq ft back to target unit', () => {
    expect(fromCanonicalSqFt('3600.0000', 'KATHA')).toBe('5.0000');
    expect(fromCanonicalSqFt('1306.8000', 'DECIMAL')).toBe('3.0000');
  });
});
