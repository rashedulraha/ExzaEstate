import { describe, expect, it } from 'vitest';
import { compareSemver, isClientVersionSupported, parseSemver } from './semver.js';

describe('SemVer utilities', () => {
  it('parses semver versions correctly', () => {
    expect(parseSemver('1.2.3')).toEqual([1, 2, 3]);
    expect(parseSemver('v1.2.3')).toEqual([1, 2, 3]);
    expect(parseSemver('0.1.0-alpha')).toEqual([0, 1, 0]);
    expect(parseSemver('')).toEqual([0, 0, 0]);
  });

  it('compares semver strings accurately', () => {
    expect(compareSemver('1.0.0', '0.9.9')).toBe(1);
    expect(compareSemver('0.9.9', '1.0.0')).toBe(-1);
    expect(compareSemver('1.2.3', '1.2.3')).toBe(0);
    expect(compareSemver('0.1.1', '0.1.0')).toBe(1);
    expect(compareSemver('0.1.0', '0.1.1')).toBe(-1);
    expect(compareSemver('0.2.0', '0.1.9')).toBe(1);
    expect(compareSemver('v0.1.0', '0.1.0')).toBe(0);
  });

  it('validates client version against minimum required', () => {
    expect(isClientVersionSupported('0.1.0', '0.1.0')).toBe(true);
    expect(isClientVersionSupported('0.2.0', '0.1.0')).toBe(true);
    expect(isClientVersionSupported('1.0.0', '0.1.0')).toBe(true);
    expect(isClientVersionSupported('0.0.9', '0.1.0')).toBe(false);
    expect(isClientVersionSupported(undefined, '0.1.0')).toBe(true);
    expect(isClientVersionSupported('', '0.1.0')).toBe(true);
  });
});
