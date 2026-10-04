import { PERMISSIONS } from '@exzaestate/shared';

export interface DiscountTierEvaluation {
  required: boolean;
  tier?: 1 | 2 | 3;
  requiredPermission?: string;
  isPriceException?: boolean;
}

export function evaluateDiscountTier(
  discountPct: number,
  freeAllowancePct: number = 0,
  propertyDiscountLimitPct?: number | null,
): DiscountTierEvaluation {
  if (discountPct <= freeAllowancePct) {
    return { required: false };
  }

  const isException =
    propertyDiscountLimitPct !== undefined &&
    propertyDiscountLimitPct !== null &&
    discountPct > propertyDiscountLimitPct;

  if (isException) {
    return {
      required: true,
      tier: 3,
      requiredPermission: PERMISSIONS.DISCOUNT_APPROVE_TIER3,
      isPriceException: true,
    };
  }

  if (discountPct <= 2.0) {
    return {
      required: true,
      tier: 1,
      requiredPermission: PERMISSIONS.DISCOUNT_APPROVE_TIER1,
    };
  }

  if (discountPct <= 5.0) {
    return {
      required: true,
      tier: 2,
      requiredPermission: PERMISSIONS.DISCOUNT_APPROVE_TIER2,
    };
  }

  return {
    required: true,
    tier: 3,
    requiredPermission: PERMISSIONS.DISCOUNT_APPROVE_TIER3,
  };
}

export function canPermissionApprove(
  userPermissions: readonly string[],
  requiredPermission: string,
): boolean {
  if (userPermissions.includes(requiredPermission)) {
    return true;
  }

  // Tier hierarchy for discounts: tier3 > tier2 > tier1
  if (requiredPermission === PERMISSIONS.DISCOUNT_APPROVE_TIER1) {
    return (
      userPermissions.includes(PERMISSIONS.DISCOUNT_APPROVE_TIER2) ||
      userPermissions.includes(PERMISSIONS.DISCOUNT_APPROVE_TIER3)
    );
  }

  if (requiredPermission === PERMISSIONS.DISCOUNT_APPROVE_TIER2) {
    return userPermissions.includes(PERMISSIONS.DISCOUNT_APPROVE_TIER3);
  }

  return false;
}
