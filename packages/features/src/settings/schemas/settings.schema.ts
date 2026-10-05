import { z } from 'zod';

export const landUnitFactorsSchema = z.object({
  decimal: z.number().positive('Decimal must be positive'),
  acre: z.number().positive('Acre must be positive'),
  katha: z.number().positive('Katha must be positive'),
  bigha: z.number().positive('Bigha must be positive'),
});

export type LandUnitFactors = z.infer<typeof landUnitFactorsSchema>;

export const generalSettingsSchema = z.object({
  fiscal_year_start_month: z.number().int().min(1).max(12),
  timezone: z.string().min(1),
  currency: z.string().min(3).max(3),
  nightly_job_time: z.string().min(1),
  land_unit_factors: landUnitFactorsSchema,
});

export type GeneralSettingsFormData = z.infer<typeof generalSettingsSchema>;

export const salesSettingsSchema = z.object({
  min_booking_pct: z.number().min(0).max(100),
  reservation_hold_hours: z.number().int().positive(),
  approval_sla_hours: z.number().int().positive(),
  free_discount_limit_pct: z.number().min(0).max(100),
  discount_base: z.enum(['BASE_PLUS_PREMIUM', 'BASE_ONLY']),
  completion_policy: z.enum(['FULLY_PAID', 'POSSESSION_GIVEN', 'DEED_EXECUTED']),
  single_user_auto_approve: z.boolean(),
  allow_md_self_approval: z.boolean(),
});

export type SalesSettingsFormData = z.infer<typeof salesSettingsSchema>;

export const financialSettingsSchema = z.object({
  revenue_recognition: z.enum(['ON_BOOKING', 'ON_AGREEMENT', 'ON_HANDOVER']),
  expense_md_threshold: z.number().int().nonnegative(),
  manual_journal_approval_threshold: z.number().int().nonnegative(),
  cancellation_deduction_pct: z.number().min(0).max(100),
  cheque_post_on: z.enum(['CLEARED', 'RECEIVED']),
  auto_apply_advance: z.boolean(),
  vendor_withholding_enabled: z.boolean(),
});

export type FinancialSettingsFormData = z.infer<typeof financialSettingsSchema>;

export const numberingPatternSchema = z.object({
  prefix: z.string().max(32).optional(),
  pattern: z.string().min(1, 'Pattern is required').max(128),
  resetRule: z.enum(['NEVER', 'YEARLY', 'FISCAL_YEARLY']).optional(),
  isActive: z.boolean().optional(),
  confirmSeriesChange: z.boolean().optional(),
});

export type NumberingPatternFormData = z.infer<typeof numberingPatternSchema>;

export interface NumberingPatternItem {
  id: string;
  documentType: string;
  prefix: string | null;
  pattern: string;
  resetRule: 'NEVER' | 'YEARLY' | 'FISCAL_YEARLY';
  nextSequence: number;
  isActive: boolean;
  updatedAt: string;
}

export interface NumberingPreviewResult {
  documentType: string;
  sampleNumber: string;
  resolvedPattern: string;
  pattern: string;
}
