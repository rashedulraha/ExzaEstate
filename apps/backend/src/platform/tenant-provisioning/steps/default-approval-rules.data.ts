import { PERMISSIONS } from '@exzaestate/shared';

export interface DefaultApprovalRuleData {
  type: string;
  name: string;
  description: string;
  minPercentage?: number;
  maxPercentage?: number;
  minAmountPaisa?: bigint;
  maxAmountPaisa?: bigint;
  requiredPermission: string;
  stepOrder: number;
  slaHours: number;
}

export const DEFAULT_APPROVAL_RULES: DefaultApprovalRuleData[] = [
  {
    type: 'DISCOUNT',
    name: 'Discount Tier 1 (Up to 2%)',
    description: 'Discounts exceeding free allowance up to 2% require Tier 1 approval (GM or MD)',
    minPercentage: 0.01,
    maxPercentage: 2.0,
    requiredPermission: PERMISSIONS.DISCOUNT_APPROVE_TIER1,
    stepOrder: 1,
    slaHours: 24,
  },
  {
    type: 'DISCOUNT',
    name: 'Discount Tier 2 (2% to 5%)',
    description: 'Discounts exceeding 2% up to 5% require Tier 2 approval (GM or MD)',
    minPercentage: 2.01,
    maxPercentage: 5.0,
    requiredPermission: PERMISSIONS.DISCOUNT_APPROVE_TIER2,
    stepOrder: 1,
    slaHours: 24,
  },
  {
    type: 'DISCOUNT',
    name: 'Discount Tier 3 (Above 5%)',
    description: 'Discounts exceeding 5% require Tier 3 approval (MD only)',
    minPercentage: 5.01,
    maxPercentage: 100.0,
    requiredPermission: PERMISSIONS.DISCOUNT_APPROVE_TIER3,
    stepOrder: 1,
    slaHours: 24,
  },
  {
    type: 'PRICE_EXCEPTION',
    name: 'Property Discount Ceiling Price Exception',
    description:
      'Discounts exceeding individual property discount ceiling require MD price exception approval',
    requiredPermission: PERMISSIONS.DISCOUNT_APPROVE_TIER3,
    stepOrder: 1,
    slaHours: 24,
  },
  {
    type: 'EXPENSE',
    name: 'Standard Expense Verification',
    description:
      'Operational expenses up to ৳5,00,000 verified by General Manager or Accounts Head',
    minAmountPaisa: 0n,
    maxAmountPaisa: 50000000n, // ৳5,00,000
    requiredPermission: PERMISSIONS.EXPENSE_VERIFY,
    stepOrder: 1,
    slaHours: 48,
  },
  {
    type: 'EXPENSE',
    name: 'Large Expense Authorization',
    description: 'High-value expenses exceeding ৳5,00,000 require Managing Director authorization',
    minAmountPaisa: 50000001n,
    requiredPermission: PERMISSIONS.EXPENSE_VERIFY,
    stepOrder: 1,
    slaHours: 48,
  },
  {
    type: 'REFUND',
    name: 'Customer Refund Approval',
    description: 'Customer booking cancellation refund approval (Accountant / MD)',
    minAmountPaisa: 0n,
    requiredPermission: PERMISSIONS.PAYMENT_REFUND,
    stepOrder: 1,
    slaHours: 48,
  },
];
