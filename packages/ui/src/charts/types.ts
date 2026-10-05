export interface ChartBaseProps {
  title?: string;
  subtitle?: string;
  className?: string;
  ariaLabel?: string;
  showTableToggle?: boolean;
}

export interface SparklinePoint {
  date: string;
  value: number;
  label?: string;
}

export interface AgingBucketItem {
  key: '1-7' | '8-30' | '31-60' | '61-90' | '90+';
  label: string;
  amountPaisa: bigint | number | string;
  count?: number;
}

export interface FunnelStage {
  id: string;
  label: string;
  count: number;
  valuePaisa?: bigint | number | string;
}

export interface BulletMetric {
  id: string;
  label: string;
  actual: number;
  target: number;
  unit?: string;
  warningThreshold?: number; // default 0.85 (85%)
  dangerThreshold?: number; // default 1.0 (100%)
}

export interface WaterfallItem {
  id: string;
  label: string;
  amountPaisa: bigint | number | string;
  type: 'initial' | 'decrease' | 'increase' | 'total';
}

export interface CashFlowPoint {
  date: string;
  inflow: number;
  outflow: number;
  net: number;
  balance?: number;
}
