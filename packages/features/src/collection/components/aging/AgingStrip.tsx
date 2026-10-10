import { formatMoney } from '@exzaestate/shared';
import { Skeleton } from '@exzaestate/ui';
import type { AgingBucketSummary } from '../../hooks/useAgingDashboard.js';

export interface AgingStripProps {
  buckets: AgingBucketSummary[];
  totalReceivablePaisa: string;
  isLoading?: boolean;
  className?: string;
}

// 5 sequential primary tints per design.md §7.2: 10%, 25%, 40%, 75%, 100%
// High-contrast text colors: dark text on light tints, crisp white on deep saturated primary fills
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
    bg: 'bg-primary/40',
    text: 'text-text font-semibold',
    border: 'border-primary/50',
  },
  '61_90': {
    bg: 'bg-primary/75',
    text: 'text-on-primary font-semibold',
    border: 'border-primary/85',
  },
  '90_PLUS': {
    bg: 'bg-primary',
    text: 'text-on-primary font-semibold',
    border: 'border-primary',
  },
};

export function AgingStrip({
  buckets,
  totalReceivablePaisa,
  isLoading = false,
  className = '',
}: AgingStripProps) {
  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`} aria-label="Loading aging distribution">
        <Skeleton className="w-full h-8 rounded-card" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-3.5 rounded-card border border-border bg-surface space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-16" />
                <Skeleton className="h-4 w-10 rounded-full" />
              </div>
              <Skeleton className="h-6 w-24 my-1" />
              <Skeleton className="h-3 w-28" />
            </div>
          ))}
        </div>
      </div>
    );
  }

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
        {total === 0n ? (
          <div className="w-full h-full flex items-center justify-center text-caption font-medium text-text-muted bg-surface-sunken">
            No overdue installment dues recorded
          </div>
        ) : (
          buckets.map((b) => {
            const theme = BUCKET_THEMES[b.bucket] || BUCKET_THEMES['1_7']!;
            const widthPct = Math.max(b.percentage, b.count > 0 ? 3 : 0);

            if (widthPct <= 0) return null;

            return (
              <div
                key={b.bucket}
                style={{ width: `${widthPct}%` }}
                className={`h-full ${theme.bg} transition-all duration-150 flex items-center justify-center px-1 text-caption font-medium border-r border-border-subtle last:border-r-0`}
                title={`${b.label}: ${b.amountFormatted} (${b.percentage.toFixed(1)}%)`}
              >
                {widthPct > 8 && (
                  <span className={`truncate text-caption font-semibold ${theme.text}`}>
                    {b.label}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Direct-Labelled Cards Grid (Responsive 1-to-5 columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {buckets.map((b) => {
          const isDangerBucket = b.bucket === '90_PLUS';

          return (
            <div
              key={b.bucket}
              className="p-3.5 rounded-card border border-border bg-surface space-y-1.5 hover:border-primary/40 transition-colors shadow-xs"
              data-testid={`aging-card-${b.bucket}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
                  {b.label}
                </span>
                <span className="text-caption font-medium px-2 py-0.5 rounded-full bg-surface-sunken text-text-muted tabular-nums">
                  {b.count} {b.count === 1 ? 'inst' : 'insts'}
                </span>
              </div>
              <p
                className={`text-h3 font-bold tabular-nums ${
                  isDangerBucket ? 'text-danger' : 'text-text'
                }`}
              >
                {b.amountFormatted || formatMoney(b.amountPaisa)}
              </p>
              <div className="flex items-center justify-between text-caption text-text-muted pt-1 border-t border-border/40">
                <span>Distribution:</span>
                <span className="font-semibold text-text tabular-nums">
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
