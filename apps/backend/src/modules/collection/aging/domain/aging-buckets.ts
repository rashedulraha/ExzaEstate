export type AgingBucketKey =
  | 'CURRENT'
  | 'DAYS_1_7'
  | 'DAYS_8_30'
  | 'DAYS_31_60'
  | 'DAYS_61_90'
  | 'DAYS_90_PLUS';

export interface AgingBucketConfig {
  key: AgingBucketKey;
  label: string;
  minDays: number;
  maxDays: number;
}

export const AGING_BUCKETS: readonly AgingBucketConfig[] = [
  { key: 'CURRENT', label: 'Current / Not Due', minDays: -Infinity, maxDays: 0 },
  { key: 'DAYS_1_7', label: '1–7 Days', minDays: 1, maxDays: 7 },
  { key: 'DAYS_8_30', label: '8–30 Days', minDays: 8, maxDays: 30 },
  { key: 'DAYS_31_60', label: '31–60 Days', minDays: 31, maxDays: 60 },
  { key: 'DAYS_61_90', label: '61–90 Days', minDays: 61, maxDays: 90 },
  { key: 'DAYS_90_PLUS', label: '90+ Days', minDays: 91, maxDays: Infinity },
] as const;

export function resolveAgingBucket(overdueDays: number): AgingBucketKey {
  if (overdueDays <= 0) return 'CURRENT';
  if (overdueDays <= 7) return 'DAYS_1_7';
  if (overdueDays <= 30) return 'DAYS_8_30';
  if (overdueDays <= 60) return 'DAYS_31_60';
  if (overdueDays <= 90) return 'DAYS_61_90';
  return 'DAYS_90_PLUS';
}
