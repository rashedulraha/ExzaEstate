import { z } from 'zod';

export interface SettingDefinition<T = unknown> {
  key: string;
  defaultValue: T;
  description: string;
  schema: z.ZodType<T>;
  isSensitive?: boolean;
}

export const SETTINGS_CATALOGUE: Record<string, SettingDefinition<unknown>> = {
  currency: {
    key: 'currency',
    defaultValue: 'BDT',
    description: 'System functional currency (fixed for v1)',
    schema: z.string().min(3).max(3),
  },
  timezone: {
    key: 'timezone',
    defaultValue: 'Asia/Dhaka',
    description: 'Operating timezone for business dates and calendar display',
    schema: z.string().min(1).max(64),
  },
  fiscal_year_start_month: {
    key: 'fiscal_year_start_month',
    defaultValue: 7,
    description: 'Start month of company fiscal year (1-12, default 7 for July)',
    schema: z.number().int().min(1).max(12),
  },
  land_unit_factors: {
    key: 'land_unit_factors',
    defaultValue: {
      decimal: 435.6,
      acre: 43560,
      katha: 720,
      bigha: 14400,
    },
    description: 'Square feet conversion factors for Bangladeshi land units',
    schema: z.object({
      decimal: z.number().positive(),
      acre: z.number().positive(),
      katha: z.number().positive(),
      bigha: z.number().positive(),
    }),
  },
  revenue_recognition: {
    key: 'revenue_recognition',
    defaultValue: 'ON_BOOKING',
    description: 'Accounting revenue recognition trigger milestone',
    schema: z.enum(['ON_BOOKING', 'ON_AGREEMENT', 'ON_HANDOVER']),
    isSensitive: true,
  },
  min_booking_pct: {
    key: 'min_booking_pct',
    defaultValue: 10,
    description: 'Minimum booking money percentage of net price required for confirmation',
    schema: z.number().min(0).max(100),
  },
  reservation_hold_hours: {
    key: 'reservation_hold_hours',
    defaultValue: 72,
    description: 'Auto-cancel timeout in hours for unfunded REQUESTED bookings',
    schema: z.number().int().positive(),
  },
  approval_sla_hours: {
    key: 'approval_sla_hours',
    defaultValue: 24,
    description: 'Escalation reminder threshold in hours for pending approvals',
    schema: z.number().int().positive(),
  },
  free_discount_limit_pct: {
    key: 'free_discount_limit_pct',
    defaultValue: 0,
    description: 'Discount percentage allowed without requiring approval',
    schema: z.number().min(0).max(100),
  },
  discount_base: {
    key: 'discount_base',
    defaultValue: 'BASE_PLUS_PREMIUM',
    description: 'Price basis on which discount percentage is calculated',
    schema: z.enum(['BASE_PLUS_PREMIUM', 'BASE_ONLY']),
  },
  approval_rules: {
    key: 'approval_rules',
    defaultValue: [
      { tier: 1, maxPct: 2, permission: 'discount:approve-tier1' },
      { tier: 2, maxPct: 5, permission: 'discount:approve-tier2' },
      { tier: 3, maxPct: null, permission: 'discount:approve-tier3' },
    ],
    description: 'Discount approval escalation tiers and required permissions',
    schema: z.array(
      z.object({
        tier: z.number().int().positive(),
        maxPct: z.number().positive().nullable(),
        permission: z.string().min(1),
      }),
    ),
    isSensitive: true,
  },
  expense_md_threshold: {
    key: 'expense_md_threshold',
    defaultValue: '50000000', // 5,00,000 BDT in paisa
    description: 'Expense amount in paisa exceeding which MD approval is mandatory',
    schema: z
      .string()
      .regex(/^\d+$/, 'Threshold must be a valid integer string representation of paisa'),
    isSensitive: true,
  },
  manual_journal_approval_threshold: {
    key: 'manual_journal_approval_threshold',
    defaultValue: '100000000', // 10,00,000 BDT in paisa
    description: 'Manual journal voucher amount in paisa exceeding which approval is mandatory',
    schema: z
      .string()
      .regex(/^\d+$/, 'Threshold must be a valid integer string representation of paisa'),
    isSensitive: true,
  },
  cancellation_deduction_pct: {
    key: 'cancellation_deduction_pct',
    defaultValue: 10,
    description: 'Percentage of paid amount deducted on booking cancellation',
    schema: z.number().min(0).max(100),
  },
  cancellation_property_status: {
    key: 'cancellation_property_status',
    defaultValue: 'Available',
    description: 'Status assigned to property when booking is cancelled',
    schema: z.enum(['Available', 'Blocked']),
  },
  completion_policy: {
    key: 'completion_policy',
    defaultValue: 'FULLY_PAID',
    description: 'Precondition for booking to enter COMPLETED status',
    schema: z.enum(['FULLY_PAID', 'AGREEMENT_DONE']),
  },
  installment_default_split: {
    key: 'installment_default_split',
    defaultValue: 'EQUAL',
    description: 'Default schedule allocation strategy for installments',
    schema: z.enum(['EQUAL', 'CUSTOM']),
  },
  late_fee_rate: {
    key: 'late_fee_rate',
    defaultValue: 0,
    description: 'Monthly simple interest percentage on overdue principal (0 = disabled)',
    schema: z.number().min(0).max(100),
  },
  late_fee_grace_days: {
    key: 'late_fee_grace_days',
    defaultValue: 0,
    description: 'Grace period in days before late fee applies',
    schema: z.number().int().min(0),
  },
  allocation_order: {
    key: 'allocation_order',
    defaultValue: [
      'BOOKING_AMOUNT',
      'DOWNPAYMENT',
      'LATE_FEE',
      'INSTALLMENT_OLDEST_FIRST',
      'CUSTOMER_ADVANCE',
    ],
    description: 'Default priority sequence when allocating customer receipts',
    schema: z.array(z.string().min(1)),
  },
  auto_apply_advance: {
    key: 'auto_apply_advance',
    defaultValue: false,
    description: 'Whether customer advances automatically clear upcoming dues',
    schema: z.boolean(),
  },
  cheque_post_on: {
    key: 'cheque_post_on',
    defaultValue: 'CLEARED',
    description: 'Whether cheque payments post to general ledger on receipt or clearing',
    schema: z.enum(['CLEARED', 'RECEIVED']),
  },
  reminder_schedule: {
    key: 'reminder_schedule',
    defaultValue: [-7, -3, 0, 3, 7, 30],
    description: 'Days relative to installment due date on which reminders trigger',
    schema: z.array(z.number().int()),
  },
  budget_alert_levels: {
    key: 'budget_alert_levels',
    defaultValue: [70, 85, 100],
    description: 'Percentage milestones for cost center budget utilization alerts',
    schema: z.array(z.number().min(0).max(100)),
  },
  vat_rate_by_charge_type: {
    key: 'vat_rate_by_charge_type',
    defaultValue: {},
    description: 'VAT percentage mappings by additional charge type',
    schema: z.record(z.string(), z.number().min(0).max(100)),
  },
  vendor_withholding_enabled: {
    key: 'vendor_withholding_enabled',
    defaultValue: false,
    description: 'Whether TDS / VDS withholding deductions apply to vendor bills',
    schema: z.boolean(),
  },
  commission_trigger: {
    key: 'commission_trigger',
    defaultValue: 'ON_CONFIRMED',
    description: 'Event milestone when broker commissions become payable',
    schema: z.enum(['ON_CONFIRMED', 'ON_HANDOVER']),
  },
  commission_clawback: {
    key: 'commission_clawback',
    defaultValue: true,
    description: 'Whether paid broker commission is subject to clawback on cancellation',
    schema: z.boolean(),
  },
  single_user_auto_approve: {
    key: 'single_user_auto_approve',
    defaultValue: false,
    description: 'Auto-approve workflow approvals when only one user exists in the tenant',
    schema: z.boolean(),
  },
  allow_md_self_approval: {
    key: 'allow_md_self_approval',
    defaultValue: false,
    description: 'Whether Managing Director may approve their own requests (audit logged)',
    schema: z.boolean(),
    isSensitive: true,
  },
  document_language: {
    key: 'document_language',
    defaultValue: 'en',
    description: 'Default language template for customer-facing documents',
    schema: z.enum(['en', 'bn']),
  },
  license_grace_days: {
    key: 'license_grace_days',
    defaultValue: 15,
    description: 'Grace period in days following license expiry before tenant enters read-only',
    schema: z.number().int().min(0),
  },
  standalone_backup_warn_days: {
    key: 'standalone_backup_warn_days',
    defaultValue: 7,
    description: 'Threshold in days without backup before desktop banner warns',
    schema: z.number().int().positive(),
  },
  nightly_job_time: {
    key: 'nightly_job_time',
    defaultValue: '00:30',
    description: 'Scheduled execution time in Asia/Dhaka for nightly maintenance jobs',
    schema: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be HH:MM format'),
  },
};

export const SENSITIVE_SETTINGS_KEYS = new Set(
  Object.values(SETTINGS_CATALOGUE)
    .filter((s) => s.isSensitive)
    .map((s) => s.key),
);
