import { describe, expect, it } from 'vitest';
import { PERMISSIONS } from '@exzaestate/shared';
import { canPermissionApprove, evaluateDiscountTier } from './discount-matrix.js';

describe('Discount Matrix Domain Unit Tests (Task A4.4)', () => {
  describe('evaluateDiscountTier', () => {
    it('returns required=false when discount is within free allowance', () => {
      expect(evaluateDiscountTier(0, 0)).toEqual({ required: false });
      expect(evaluateDiscountTier(1.5, 2.0)).toEqual({ required: false });
    });

    it('evaluates Tier 1 (<= 2%)', () => {
      const result = evaluateDiscountTier(1.5, 0);
      expect(result.required).toBe(true);
      expect(result.tier).toBe(1);
      expect(result.requiredPermission).toBe(PERMISSIONS.DISCOUNT_APPROVE_TIER1);
      expect(result.isPriceException).toBeFalsy();
    });

    it('evaluates Tier 2 (> 2% and <= 5%)', () => {
      const result = evaluateDiscountTier(4.0, 0);
      expect(result.required).toBe(true);
      expect(result.tier).toBe(2);
      expect(result.requiredPermission).toBe(PERMISSIONS.DISCOUNT_APPROVE_TIER2);
    });

    it('evaluates Tier 3 (> 5%)', () => {
      const result = evaluateDiscountTier(6.0, 0);
      expect(result.required).toBe(true);
      expect(result.tier).toBe(3);
      expect(result.requiredPermission).toBe(PERMISSIONS.DISCOUNT_APPROVE_TIER3);
    });

    it('flags price exception when discount exceeds property discount limit', () => {
      // Property discount limit is 3%, requested is 3.5%
      const result = evaluateDiscountTier(3.5, 0, 3.0);
      expect(result.required).toBe(true);
      expect(result.tier).toBe(3);
      expect(result.requiredPermission).toBe(PERMISSIONS.DISCOUNT_APPROVE_TIER3);
      expect(result.isPriceException).toBe(true);
    });
  });

  describe('canPermissionApprove (Tier Hierarchy)', () => {
    it('allows exact permission match', () => {
      expect(
        canPermissionApprove(
          [PERMISSIONS.DISCOUNT_APPROVE_TIER1],
          PERMISSIONS.DISCOUNT_APPROVE_TIER1,
        ),
      ).toBe(true);
    });

    it('allows Tier 2 holder to approve Tier 1', () => {
      expect(
        canPermissionApprove(
          [PERMISSIONS.DISCOUNT_APPROVE_TIER2],
          PERMISSIONS.DISCOUNT_APPROVE_TIER1,
        ),
      ).toBe(true);
    });

    it('does not allow Tier 1 holder to approve Tier 2 or Tier 3', () => {
      expect(
        canPermissionApprove(
          [PERMISSIONS.DISCOUNT_APPROVE_TIER1],
          PERMISSIONS.DISCOUNT_APPROVE_TIER2,
        ),
      ).toBe(false);
      expect(
        canPermissionApprove(
          [PERMISSIONS.DISCOUNT_APPROVE_TIER1],
          PERMISSIONS.DISCOUNT_APPROVE_TIER3,
        ),
      ).toBe(false);
    });

    it('allows Tier 3 holder (MD) to approve Tier 1, Tier 2, and Tier 3', () => {
      const perms = [PERMISSIONS.DISCOUNT_APPROVE_TIER3];
      expect(canPermissionApprove(perms, PERMISSIONS.DISCOUNT_APPROVE_TIER1)).toBe(true);
      expect(canPermissionApprove(perms, PERMISSIONS.DISCOUNT_APPROVE_TIER2)).toBe(true);
      expect(canPermissionApprove(perms, PERMISSIONS.DISCOUNT_APPROVE_TIER3)).toBe(true);
    });
  });
});
