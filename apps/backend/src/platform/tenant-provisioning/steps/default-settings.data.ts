import type { Prisma } from '@prisma/client';

export interface DefaultSettingItem {
  key: string;
  defaultValue: Prisma.InputJsonValue;
}

export const DEFAULT_COMPANY_SETTINGS: DefaultSettingItem[] = [
  { key: 'currency', defaultValue: 'BDT' },
  { key: 'timezone', defaultValue: 'Asia/Dhaka' },
  { key: 'fiscal_year_start_month', defaultValue: 7 },
  {
    key: 'land_unit_factors',
    defaultValue: {
      decimal: 435.6,
      acre: 43560,
      katha: 720,
      bigha: 14400,
    },
  },
  { key: 'revenue_recognition', defaultValue: 'ON_BOOKING' },
  { key: 'min_booking_pct', defaultValue: 10 },
  { key: 'reservation_hold_hours', defaultValue: 72 },
  { key: 'approval_sla_hours', defaultValue: 24 },
  { key: 'free_discount_limit_pct', defaultValue: 0 },
  { key: 'discount_base', defaultValue: 'BASE_PLUS_PREMIUM' },
  {
    key: 'approval_rules',
    defaultValue: [
      { tier: 1, maxPct: 2, permission: 'discount:approve-tier1' },
      { tier: 2, maxPct: 5, permission: 'discount:approve-tier2' },
      { tier: 3, maxPct: null, permission: 'discount:approve-tier3' },
    ],
  },
  { key: 'expense_md_threshold', defaultValue: '50000000' },
  { key: 'manual_journal_approval_threshold', defaultValue: '100000000' },
  { key: 'cancellation_deduction_pct', defaultValue: 10 },
  { key: 'cancellation_property_status', defaultValue: 'Available' },
  { key: 'completion_policy', defaultValue: 'FULLY_PAID' },
  { key: 'installment_default_split', defaultValue: 'EQUAL' },
  { key: 'late_fee_rate', defaultValue: 0 },
  { key: 'late_fee_grace_days', defaultValue: 0 },
  {
    key: 'allocation_order',
    defaultValue: [
      'BOOKING_AMOUNT',
      'DOWNPAYMENT',
      'LATE_FEE',
      'INSTALLMENT_OLDEST_FIRST',
      'CUSTOMER_ADVANCE',
    ],
  },
  { key: 'auto_apply_advance', defaultValue: false },
  { key: 'cheque_post_on', defaultValue: 'CLEARED' },
  { key: 'reminder_schedule', defaultValue: [-7, -3, 0, 3, 7, 30] },
  { key: 'budget_alert_levels', defaultValue: [70, 85, 100] },
  { key: 'vat_rate_by_charge_type', defaultValue: {} },
  { key: 'vendor_withholding_enabled', defaultValue: false },
  { key: 'commission_trigger', defaultValue: 'ON_CONFIRMED' },
  { key: 'commission_clawback', defaultValue: true },
  { key: 'single_user_auto_approve', defaultValue: false },
  { key: 'allow_md_self_approval', defaultValue: false },
  { key: 'document_language', defaultValue: 'en' },
  { key: 'license_grace_days', defaultValue: 15 },
  { key: 'standalone_backup_warn_days', defaultValue: 7 },
  { key: 'nightly_job_time', defaultValue: '00:30' },
];
