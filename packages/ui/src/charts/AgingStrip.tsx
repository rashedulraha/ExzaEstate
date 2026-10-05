import { useState } from 'react';
import { Table, Eye } from 'lucide-react';
import { formatMoney } from '@exzaestate/shared';
import type { AgingBucketItem, ChartBaseProps } from './types.js';

export interface AgingStripProps extends ChartBaseProps {
  buckets: AgingBucketItem[];
  totalLabel?: string;
}

// Sequential 5 tints of primary per design.md §7.2 (10%, 25%, 45%, 70%, 100%)
const TINT_CLASSES = [
  'bg-primary/10 text-primary-fg border-primary/20',
  'bg-primary/25 text-primary-fg border-primary/30',
  'bg-primary/45 text-white border-primary/50',
  'bg-primary/70 text-white border-primary/80',
  'bg-primary text-white border-primary',
];

const TINT_COLORS = [
  'rgba(26, 26, 46, 0.12)',
  'rgba(26, 26, 46, 0.28)',
  'rgba(26, 26, 46, 0.50)',
  'rgba(26, 26, 46, 0.75)',
  'rgba(26, 26, 46, 1.00)',
];

function AgingTableView({ buckets, totalNum }: { buckets: AgingBucketItem[]; totalNum: number }) {
  return (
    <div className="border border-border rounded overflow-hidden">
      <table className="w-full text-left text-small">
        <thead className="bg-surface-sunken text-text-muted border-b border-border text-caption">
          <tr>
            <th className="px-3 py-2 font-medium">Bucket (Days)</th>
            <th className="px-3 py-2 text-right font-medium">Count</th>
            <th className="px-3 py-2 text-right font-medium">Amount</th>
            <th className="px-3 py-2 text-right font-medium">Share</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {buckets.map((b) => {
            const bAmount = BigInt(b.amountPaisa.toString());
            const sharePct = totalNum > 0 ? ((Number(bAmount) / totalNum) * 100).toFixed(1) : '0.0';
            return (
              <tr key={b.key}>
                <td className="px-3 py-2 font-medium text-text">{b.label}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-text-muted">
                  {b.count ?? '-'}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums font-medium text-text">
                  {formatMoney(bAmount)}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-text-muted">
                  {sharePct}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AgingBarView({ buckets, totalNum }: { buckets: AgingBucketItem[]; totalNum: number }) {
  return (
    <div className="space-y-3">
      {/* Horizontal Stacked Bar */}
      <div className="w-full h-8 flex rounded overflow-hidden border border-border-strong/40 bg-surface-sunken">
        {buckets.map((b, idx) => {
          const bAmount = BigInt(b.amountPaisa.toString());
          const ratio = totalNum > 0 ? Number(bAmount) / totalNum : 0;
          if (ratio <= 0) return null;

          const pct = (ratio * 100).toFixed(2);
          const bgColor = TINT_COLORS[idx % TINT_COLORS.length];
          const isDark = idx >= 2;

          return (
            <div
              key={b.key}
              style={{ width: `${pct}%`, backgroundColor: bgColor }}
              className={`h-full flex items-center justify-center px-1 text-caption font-mono tabular-nums font-semibold transition-all relative group cursor-default ${
                isDark ? 'text-white' : 'text-primary'
              }`}
              title={`${b.label}: ${formatMoney(bAmount)} (${pct}%)`}
            >
              {ratio >= 0.1 && <span className="truncate text-[11px] drop-shadow-xs">{pct}%</span>}
            </div>
          );
        })}
      </div>

      {/* Direct Labels on marks / bucket legend below */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
        {buckets.map((b, idx) => {
          const bAmount = BigInt(b.amountPaisa.toString());
          const ratio = totalNum > 0 ? Number(bAmount) / totalNum : 0;
          const pct = (ratio * 100).toFixed(1);
          const tintClass = TINT_CLASSES[idx % TINT_CLASSES.length];

          return (
            <div
              key={b.key}
              className={`p-2.5 rounded border flex flex-col justify-between ${tintClass}`}
            >
              <div className="flex items-center justify-between text-caption font-semibold">
                <span>{b.label}</span>
                <span className="font-mono tabular-nums text-[11px] opacity-80">{pct}%</span>
              </div>
              <div className="mt-1 text-small font-semibold font-mono tabular-nums">
                {formatMoney(bAmount)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AgingHeader({
  title,
  subtitle,
  totalAmountPaisa,
  showTableToggle,
  isTableView,
  onToggleTableView,
}: {
  title: string;
  subtitle?: string;
  totalAmountPaisa: bigint;
  showTableToggle: boolean;
  isTableView: boolean;
  onToggleTableView: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h4 className="text-body font-semibold text-text">{title}</h4>
        {subtitle && <p className="text-caption text-text-muted mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-small font-semibold font-mono tabular-nums text-text">
          Total: {formatMoney(totalAmountPaisa)}
        </span>
        {showTableToggle && (
          <button
            type="button"
            onClick={onToggleTableView}
            className="p-1 rounded text-text-muted hover:text-text hover:bg-surface-sunken cursor-pointer transition-colors"
            title={isTableView ? 'View strip' : 'View as table'}
            aria-label={isTableView ? 'View strip' : 'View as table'}
          >
            {isTableView ? <Eye className="w-4 h-4" /> : <Table className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

export function AgingStrip({
  buckets,
  title = 'Receivable Aging Strip',
  subtitle,
  className = '',
  ariaLabel,
  showTableToggle = true,
}: AgingStripProps) {
  const [isTableView, setIsTableView] = useState(false);

  const totalAmountPaisa = buckets.reduce((acc, b) => acc + BigInt(b.amountPaisa.toString()), 0n);
  const totalNum = Number(totalAmountPaisa);

  const accessibleLabel =
    ariaLabel ??
    `${title}: Total ${formatMoney(totalAmountPaisa)}, across ${buckets.length} buckets.`;

  return (
    <div
      className={`card-workspace p-5 flex flex-col gap-4 ${className}`}
      role="region"
      aria-label={accessibleLabel}
    >
      <AgingHeader
        title={title}
        subtitle={subtitle}
        totalAmountPaisa={totalAmountPaisa}
        showTableToggle={showTableToggle}
        isTableView={isTableView}
        onToggleTableView={() => setIsTableView((prev) => !prev)}
      />

      {isTableView ? (
        <AgingTableView buckets={buckets} totalNum={totalNum} />
      ) : (
        <AgingBarView buckets={buckets} totalNum={totalNum} />
      )}
    </div>
  );
}
