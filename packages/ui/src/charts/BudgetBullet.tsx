import { useState } from 'react';
import { scaleLinear } from 'd3-scale';
import { Table, Eye } from 'lucide-react';
import type { BulletMetric, ChartBaseProps } from './types.js';

export interface BudgetBulletProps extends ChartBaseProps {
  metrics: BulletMetric[];
  formatValue?: (val: number) => string;
}

function getBudgetBadgeStyle(
  isOver: boolean,
  isWarning: boolean,
): { className: string; text: string } {
  if (isOver) {
    return { className: 'bg-danger/10 text-danger', text: 'Exceeded' };
  }
  if (isWarning) {
    return { className: 'bg-warning/10 text-warning', text: 'Warning' };
  }
  return { className: 'bg-success/10 text-success', text: 'Within Budget' };
}

function getUtilizationColor(utilRatio: number): string {
  if (utilRatio > 1.0) return 'text-danger';
  if (utilRatio >= 0.85) return 'text-warning';
  return 'text-success';
}

function getBulletBarColor(utilRatio: number): string {
  if (utilRatio > 1.0) return 'bg-danger';
  if (utilRatio >= 0.85) return 'bg-warning';
  return 'bg-primary';
}

function BudgetTableView({
  metrics,
  formatValue,
}: {
  metrics: BulletMetric[];
  formatValue: (val: number) => string;
}) {
  return (
    <div className="border border-border rounded overflow-hidden">
      <table className="w-full text-left text-small">
        <thead className="bg-surface-sunken text-text-muted border-b border-border text-caption">
          <tr>
            <th className="px-3 py-2 font-medium">Metric</th>
            <th className="px-3 py-2 text-right font-medium">Actual</th>
            <th className="px-3 py-2 text-right font-medium">Target</th>
            <th className="px-3 py-2 text-right font-medium">Utilization</th>
            <th className="px-3 py-2 text-right font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {metrics.map((m) => {
            const utilRatio = m.target > 0 ? m.actual / m.target : 0;
            const utilPct = (utilRatio * 100).toFixed(1);
            const isOver = utilRatio > 1.0;
            const isWarning = utilRatio >= 0.85;
            const badge = getBudgetBadgeStyle(isOver, isWarning);

            return (
              <tr key={m.id}>
                <td className="px-3 py-2 font-medium text-text">{m.label}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums font-semibold text-text">
                  {formatValue(m.actual)}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-text-muted">
                  {formatValue(m.target)}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums font-medium">
                  {utilPct}%
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-caption font-semibold ${badge.className}`}
                  >
                    {badge.text}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function BulletBarList({
  metrics,
  formatValue,
}: {
  metrics: BulletMetric[];
  formatValue: (val: number) => string;
}) {
  return (
    <div className="space-y-4">
      {metrics.map((m) => {
        const domainMax = Math.max(m.target * 1.15, m.actual * 1.05, 1);
        const scale = scaleLinear().domain([0, domainMax]).range([0, 100]);

        const actualWidth = Math.min(scale(m.actual), 100);
        const targetX = scale(m.target);
        const tick70 = scale(m.target * 0.7);
        const tick85 = scale(m.target * 0.85);

        const utilRatio = m.target > 0 ? m.actual / m.target : 0;
        const utilPct = (utilRatio * 100).toFixed(1);
        const barColor = getBulletBarColor(utilRatio);
        const utilColor = getUtilizationColor(utilRatio);

        return (
          <div key={m.id} className="space-y-1.5">
            <div className="flex items-center justify-between text-small">
              <span className="font-medium text-text">{m.label}</span>
              <div className="flex items-center gap-2 font-mono tabular-nums">
                <span className="font-semibold text-text">{formatValue(m.actual)}</span>
                <span className="text-text-muted">/ {formatValue(m.target)}</span>
                <span className={`text-caption font-semibold ml-1 ${utilColor}`}>({utilPct}%)</span>
              </div>
            </div>

            {/* Bullet Bar Container with 70%, 85%, 100% ticks */}
            <div className="h-6 w-full bg-surface-sunken rounded relative overflow-hidden border border-border">
              <div
                style={{ left: `${tick70}%` }}
                className="absolute top-0 bottom-0 w-px bg-border-strong border-l border-dashed z-10"
                title="70% threshold"
              />
              <div
                style={{ left: `${tick85}%` }}
                className="absolute top-0 bottom-0 w-px bg-warning/60 border-l border-dashed z-10"
                title="85% warning threshold"
              />
              <div
                style={{ left: `${targetX}%` }}
                className="absolute top-0 bottom-0 w-1 bg-text border-x border-surface z-20"
                title="Target 100%"
              />
              <div
                style={{ width: `${actualWidth}%` }}
                className={`h-full ${barColor} rounded-xs transition-all duration-200`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BudgetBulletHeader({
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
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-3 text-caption text-text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-2 bg-primary rounded-xs" />
            <span>Actual</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-2 border border-dashed border-border-strong rounded-xs" />
            <span>Budget/Target</span>
          </span>
        </div>
        {showTableToggle && (
          <button
            type="button"
            onClick={onToggleTableView}
            className="p-1 rounded text-text-muted hover:text-text hover:bg-surface-sunken cursor-pointer transition-colors"
            title={isTableView ? 'View bullets' : 'View as table'}
            aria-label={isTableView ? 'View bullets' : 'View as table'}
          >
            {isTableView ? <Eye className="w-4 h-4" /> : <Table className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

export function BudgetBullet({
  metrics,
  title = 'Budget vs Actual Utilization',
  subtitle,
  formatValue = (v) => v.toLocaleString(),
  className = '',
  ariaLabel,
  showTableToggle = true,
}: BudgetBulletProps) {
  const [isTableView, setIsTableView] = useState(false);

  const accessibleLabel =
    ariaLabel ??
    `${title}: ${metrics.map((m) => `${m.label} (${((m.actual / (m.target || 1)) * 100).toFixed(0)}%)`).join(', ')}`;

  return (
    <div
      className={`card-workspace p-5 flex flex-col gap-4 ${className}`}
      role="region"
      aria-label={accessibleLabel}
    >
      <BudgetBulletHeader
        title={title}
        subtitle={subtitle}
        showTableToggle={showTableToggle}
        isTableView={isTableView}
        onToggleTableView={() => setIsTableView((prev) => !prev)}
      />

      {isTableView ? (
        <BudgetTableView metrics={metrics} formatValue={formatValue} />
      ) : (
        <BulletBarList metrics={metrics} formatValue={formatValue} />
      )}
    </div>
  );
}
