import { formatMoney } from '@exzaestate/shared';
import type { AgingBucketSummary } from '../../hooks/useAgingDashboard.js';

export interface AgingStripProps {
  buckets: AgingBucketSummary[];
  totalReceivablePaisa: string;
  className?: string;
}

// 5 sequential primary tints per design.md §7.2: 10%, 25%, 45%, 70%, 100%
const BUCKET_THEMES: Record<string, { bg: string; text: string; border: string }> = {
  '1_7': {
    bg: 'bg-primary/10',
    text: 'text-text',
    border: 'border-primary/20',
  },
  '8_30': {
    bg: 'bg-primary/25',
    text: 'text-text',
    border: 'border-primary/35',
  },
  '31_60': {
    bg: 'bg-primary/45',
    text: 'text-primary-fg',
    border: 'border-primary/55',
  },
  '61_90': {
    bg: 'bg-primary/70',
    text: 'text-primary-fg',
    border: 'border-primary/80',
  },
  '90_PLUS': {
    bg: 'bg-primary',
    text: 'text-primary-fg',
    border: 'border-primary',
  },
};

export function AgingStrip({ buckets, totalReceivablePaisa, className = '' }: AgingStripProps) {
  const total = BigInt(totalReceivablePaisa || '0');

  return (
    <div
      className={`space-y-4 ${className}`}
      data-testid="aging-strip-component"
      aria-label="Aging strip receivables distribution"
    >
      {/* Horizontal Stacked Bar */}
      <div
        className="w-full h-8 flex rounded-card overflow-hidden border border-border bg-surface-sunken"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={100}
      >
        {buckets.map((b) => {
          const theme = BUCKET_THEMES[b.bucket] || BUCKET_THEMES['1_7']!;
          const widthPct = total > 0n ? Math.max(b.percentage, b.count > 0 ? 3 : 0) : 20;

          return (
            <div
              key={b.bucket}
              style={{ width: `${widthPct}%` }}
              className={`h-full ${theme.bg} transition-all duration-150 flex items-center justify-center px-1 text-caption font-medium border-r border-border-subtle last:border-r-0`}
              title={`${b.label}: ${b.amountFormatted} (${b.percentage.toFixed(1)}%)`}
            >
              {widthPct > 8 && (
                <span className={`truncate text-[11px] font-semibold ${theme.text}`}>
                  {b.label}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Direct-Labelled Cards Grid */}
      <div className="grid grid-cols-5 gap-3">
        {buckets.map((b) => {
          const theme = BUCKET_THEMES[b.bucket] || BUCKET_THEMES['1_7']!;

          return (
            <div
              key={b.bucket}
              className={`p-3 rounded-card border ${theme.border} bg-surface space-y-1`}
              data-testid={`aging-card-${b.bucket}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
                  {b.label}
                </span>
                <span className="text-caption text-text-muted tabular-nums">
                  {b.count} {b.count === 1 ? 'inst' : 'insts'}
                </span>
              </div>
              <p className="text-h4 font-bold text-text tabular-nums">
                {b.amountFormatted || formatMoney(b.amountPaisa)}
              </p>
              <div className="flex items-center justify-between text-caption text-text-muted">
                <span>Share:</span>
                <span className="font-medium text-text tabular-nums">
                  {b.percentage.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
