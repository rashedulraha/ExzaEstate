import { describe, it, expect } from 'vitest';
import { TYPOGRAPHY_TOKENS } from './tokens.js';

describe('Meridian Typography System & better-typography verification', () => {
  it('enforces descending scale across all heading levels', () => {
    const parsePx = (size: string) => parseInt(size.replace('px', ''), 10);

    const displayPx = parsePx(TYPOGRAPHY_TOKENS.display.fontSize);
    const h1Px = parsePx(TYPOGRAPHY_TOKENS.h1.fontSize);
    const h2Px = parsePx(TYPOGRAPHY_TOKENS.h2.fontSize);
    const h3Px = parsePx(TYPOGRAPHY_TOKENS.h3.fontSize);
    const h4Px = parsePx(TYPOGRAPHY_TOKENS.h4.fontSize);
    const h5Px = parsePx(TYPOGRAPHY_TOKENS.h5.fontSize);
    const h6Px = parsePx(TYPOGRAPHY_TOKENS.h6.fontSize);

    expect(displayPx).toBeGreaterThan(h1Px);
    expect(h1Px).toBeGreaterThan(h2Px);
    expect(h2Px).toBeGreaterThan(h3Px);
    expect(h3Px).toBeGreaterThan(h4Px);
    expect(h4Px).toBeGreaterThan(h5Px);
    expect(h5Px).toBeGreaterThanOrEqual(h6Px);
  });

  it('enforces size floor: no typography level is below 11px', () => {
    const parsePx = (size: string) => parseInt(size.replace('px', ''), 10);

    Object.entries(TYPOGRAPHY_TOKENS).forEach(([role, token]) => {
      const px = parsePx(token.fontSize);
      expect(
        px,
        `Role "${role}" fontSize (${token.fontSize}) must not be below 11px floor`,
      ).toBeGreaterThanOrEqual(11);
    });
  });

  it('enforces optical line-heights: headings tighter, body copy >= 1.5', () => {
    expect(TYPOGRAPHY_TOKENS.h1.lineHeight).toBeLessThanOrEqual(1.3);
    expect(TYPOGRAPHY_TOKENS.h2.lineHeight).toBeLessThanOrEqual(1.3);
    expect(TYPOGRAPHY_TOKENS.body.lineHeight).toBeGreaterThanOrEqual(1.5);
  });

  it('enforces letter-spacing: negative for large headings, positive for uppercase micro-labels', () => {
    // Large headings tighter letter-spacing
    expect(parseFloat(TYPOGRAPHY_TOKENS.display.letterSpacing)).toBeLessThan(0);
    expect(parseFloat(TYPOGRAPHY_TOKENS.h1.letterSpacing)).toBeLessThan(0);

    // Uppercase tags tracked out for legibility
    expect(parseFloat(TYPOGRAPHY_TOKENS.th.letterSpacing)).toBeGreaterThan(0);
    expect(parseFloat(TYPOGRAPHY_TOKENS.h6.letterSpacing)).toBeGreaterThan(0);
  });

  it('enforces tabular numbers on financial and numeric tokens', () => {
    expect(TYPOGRAPHY_TOKENS.heroNum.tabularNums).toBe(true);
  });

  it('provides dedicated navigation font token for sidebar and chrome consistency', () => {
    expect(TYPOGRAPHY_TOKENS.nav.fontSize).toBe('13px');
    expect(TYPOGRAPHY_TOKENS.nav.fontWeight).toBe(500);
  });
});
