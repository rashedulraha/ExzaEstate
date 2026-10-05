import { useState } from 'react';
import { scaleLinear } from 'd3-scale';
import { Table, Eye, ArrowDown } from 'lucide-react';
import { formatMoney } from '@exzaestate/shared';
import type { ChartBaseProps, FunnelStage } from './types.js';

export interface PipelineFunnelProps extends ChartBaseProps {
  stages: FunnelStage[];
}

function getConversionRate(stages: FunnelStage[], idx: number): string {
  const st = stages[idx];
  const nextStage = stages[idx + 1];
  if (!st) return '-';
  if (nextStage && st.count > 0) {
    return `${((nextStage.count / st.count) * 100).toFixed(1)}%`;
  }
  if (idx === stages.length - 1) {
    return 'Won';
  }
  return '-';
}

function FunnelTableView({ stages }: { stages: FunnelStage[] }) {
  return (
    <div className="border border-border rounded overflow-hidden">
      <table className="w-full text-left text-small">
        <thead className="bg-surface-sunken text-text-muted border-b border-border text-caption">
          <tr>
            <th className="px-3 py-2 font-medium">Stage</th>
            <th className="px-3 py-2 text-right font-medium">Count</th>
            <th className="px-3 py-2 text-right font-medium">Value</th>
            <th className="px-3 py-2 text-right font-medium">Conversion to Next</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {stages.map((st, idx) => (
            <tr key={st.id}>
              <td className="px-3 py-2 font-medium text-text">{st.label}</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums text-text font-semibold">
                {st.count.toLocaleString()}
              </td>
              <td className="px-3 py-2 text-right font-mono tabular-nums text-text-muted">
                {st.valuePaisa !== undefined ? formatMoney(BigInt(st.valuePaisa.toString())) : '-'}
              </td>
              <td className="px-3 py-2 text-right font-mono tabular-nums text-accent-text font-semibold">
                {getConversionRate(stages, idx)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FunnelBarView({ stages }: { stages: FunnelStage[] }) {
  const maxCount = Math.max(...stages.map((s) => s.count), 1);
  const widthScale = scaleLinear().domain([0, maxCount]).range([15, 100]);

  return (
    <div className="space-y-3 py-1">
      {stages.map((st, idx) => {
        const nextStage = stages[idx + 1];
        const conversionPct = nextStage && st.count > 0 ? (nextStage.count / st.count) * 100 : null;
        const barWidth = widthScale(st.count);

        return (
          <div key={st.id} className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="w-32 shrink-0 text-small font-medium text-text truncate">
                {st.label}
              </div>
              <div className="flex-1 flex items-center gap-3">
                <div className="h-7 rounded bg-surface-sunken flex-1 overflow-hidden relative border border-border-subtle">
                  <div
                    style={{ width: `${barWidth}%` }}
                    className="h-full bg-primary/80 transition-all duration-300 rounded flex items-center justify-between px-2.5 text-white"
                  >
                    <span className="text-caption font-semibold font-mono tabular-nums">
                      {st.count.toLocaleString()}
                    </span>
                    {st.valuePaisa !== undefined && (
                      <span className="text-[11px] font-mono tabular-nums opacity-90 hidden sm:inline">
                        {formatMoney(BigInt(st.valuePaisa.toString()))}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {conversionPct !== null && (
              <div className="ml-32 pl-4 flex items-center gap-1.5 text-caption text-text-muted">
                <ArrowDown className="w-3.5 h-3.5 text-accent" />
                <span className="font-mono tabular-nums font-medium text-accent-text">
                  {conversionPct.toFixed(1)}%
                </span>
                <span>conversion</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FunnelHeader({
  title,
  subtitle,
  showTableToggle,
  isTableView,
  onToggleTableView,
}: {
  title: string;
  subtitle?: string;
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
      {showTableToggle && (
        <button
          type="button"
          onClick={onToggleTableView}
          className="p-1 rounded text-text-muted hover:text-text hover:bg-surface-sunken cursor-pointer transition-colors"
          title={isTableView ? 'View funnel' : 'View as table'}
          aria-label={isTableView ? 'View funnel' : 'View as table'}
        >
          {isTableView ? <Eye className="w-4 h-4" /> : <Table className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
}

export function PipelineFunnel({
  stages,
  title = 'Sales Pipeline Funnel',
  subtitle,
  className = '',
  ariaLabel,
  showTableToggle = true,
}: PipelineFunnelProps) {
  const [isTableView, setIsTableView] = useState(false);

  const accessibleLabel =
    ariaLabel ?? `${title}: ${stages.map((s) => `${s.label} (${s.count})`).join(' -> ')}`;

  return (
    <div
      className={`card-workspace p-5 flex flex-col gap-4 ${className}`}
      role="region"
      aria-label={accessibleLabel}
    >
      <FunnelHeader
        title={title}
        subtitle={subtitle}
        showTableToggle={showTableToggle}
        isTableView={isTableView}
        onToggleTableView={() => setIsTableView((prev) => !prev)}
      />

      {isTableView ? <FunnelTableView stages={stages} /> : <FunnelBarView stages={stages} />}
    </div>
  );
}
