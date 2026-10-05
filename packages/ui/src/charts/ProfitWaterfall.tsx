import { useState } from 'react';
import { scaleLinear } from 'd3-scale';
import { Table, Eye } from 'lucide-react';
import { formatMoney } from '@exzaestate/shared';
import type { ChartBaseProps, WaterfallItem } from './types.js';

export interface ProfitWaterfallProps extends ChartBaseProps {
  items: WaterfallItem[];
}

interface ComputedStep extends WaterfallItem {
  rawVal: bigint;
  start: bigint;
  end: bigint;
  isNegative: boolean;
}

function getStepTextColor(s: ComputedStep): string {
  if (s.isNegative) return 'text-danger';
  if (s.type === 'total') return 'text-accent-text';
  return 'text-text';
}

function getStepFillColor(type: WaterfallItem['type']): string {
  if (type === 'decrease') return 'var(--color-danger, #b83429)';
  if (type === 'total') return 'var(--color-accent, #c8a951)';
  return 'var(--color-primary-fg, #1a1a2e)';
}

function computeWaterfallSteps(items: WaterfallItem[]): ComputedStep[] {
  let running = 0n;
  return items.map((item) => {
    const rawVal = BigInt(item.amountPaisa.toString());
    const isNegative = item.type === 'decrease';
    const stepVal = isNegative ? -rawVal : rawVal;

    let start = running;
    let end = running + stepVal;

    if (item.type === 'total') {
      start = 0n;
      end = running;
    } else {
      running = end;
    }

    return {
      ...item,
      rawVal,
      start,
      end,
      isNegative,
    };
  });
}

function WaterfallTableView({ steps }: { steps: ComputedStep[] }) {
  return (
    <div className="border border-border rounded overflow-hidden">
      <table className="w-full text-left text-small">
        <thead className="bg-surface-sunken text-text-muted border-b border-border text-caption">
          <tr>
            <th className="px-3 py-2 font-medium">Step</th>
            <th className="px-3 py-2 font-medium">Type</th>
            <th className="px-3 py-2 text-right font-medium">Amount</th>
            <th className="px-3 py-2 text-right font-medium">Cumulative Balance</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {steps.map((s) => (
            <tr key={s.id}>
              <td className="px-3 py-2 font-medium text-text">{s.label}</td>
              <td className="px-3 py-2 text-caption text-text-muted capitalize">{s.type}</td>
              <td
                className={`px-3 py-2 text-right font-mono tabular-nums font-semibold ${getStepTextColor(s)}`}
              >
                {s.isNegative ? '-' : '+'}
                {formatMoney(s.rawVal)}
              </td>
              <td className="px-3 py-2 text-right font-mono tabular-nums font-bold text-text">
                {formatMoney(s.end)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WaterfallSvgView({ steps }: { steps: ComputedStep[] }) {
  const allValues = steps.flatMap((s) => [Number(s.start), Number(s.end)]);
  const maxVal = Math.max(...allValues, 100);
  const minVal = Math.min(...allValues, 0);

  const height = 220;
  const paddingY = 24;

  const yScale = scaleLinear()
    .domain([minVal, maxVal])
    .range([height - paddingY, paddingY]);

  return (
    <div className="relative pt-2">
      {/* Hairline horizontal gridlines per design.md §7.2 */}
      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-12 pt-6">
        <div className="w-full border-b border-border-subtle" />
        <div className="w-full border-b border-border-subtle" />
        <div className="w-full border-b border-border-subtle" />
        <div className="w-full border-b border-border-subtle" />
      </div>

      {/* SVG Waterfall Bars */}
      <svg
        className="w-full overflow-visible"
        height={height}
        viewBox={`0 0 ${steps.length * 100} ${height}`}
        preserveAspectRatio="none"
      >
        {/* Zero Baseline */}
        <line
          x1="0"
          y1={yScale(0)}
          x2={steps.length * 100}
          y2={yScale(0)}
          stroke="var(--color-border-strong, #86868b)"
          strokeWidth="1"
          strokeDasharray="3 3"
        />

        {steps.map((step, idx) => {
          const x = idx * 100 + 15;
          const barWidth = 70;

          const yTop = Math.min(yScale(Number(step.start)), yScale(Number(step.end)));
          const yBottom = Math.max(yScale(Number(step.start)), yScale(Number(step.end)));
          const barHeight = Math.max(yBottom - yTop, 4);

          const fillColor = getStepFillColor(step.type);
          const nextStep = steps[idx + 1];
          const nextY = nextStep ? yScale(Number(step.end)) : null;

          return (
            <g key={step.id}>
              {/* Step Bar */}
              <rect x={x} y={yTop} width={barWidth} height={barHeight} rx="3" fill={fillColor} />

              {/* Direct Label above/below bar */}
              <text
                x={x + barWidth / 2}
                y={step.isNegative ? yBottom + 14 : yTop - 6}
                textAnchor="middle"
                className="text-[11px] font-mono tabular-nums font-semibold"
                fill="var(--color-text, #1d1d1f)"
              >
                {step.isNegative ? '-' : ''}
                {formatMoney(step.rawVal)}
              </text>

              {/* Hairline connector line to next bar */}
              {nextY !== null && (
                <line
                  x1={x + barWidth}
                  y1={nextY}
                  x2={x + 100}
                  y2={nextY}
                  stroke="var(--color-border-strong, #86868b)"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Step Labels at bottom */}
      <div className="grid grid-flow-col auto-cols-fr gap-2 mt-2 pt-2 border-t border-border">
        {steps.map((s) => (
          <div key={s.id} className="text-center truncate px-1">
            <span
              className="text-caption font-medium text-text-muted truncate block"
              title={s.label}
            >
              {s.label}
            </span>
            <span className="text-[11px] font-mono tabular-nums text-text font-bold block mt-0.5">
              {formatMoney(s.end)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WaterfallHeader({
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
          title={isTableView ? 'View waterfall' : 'View as table'}
          aria-label={isTableView ? 'View waterfall' : 'View as table'}
        >
          {isTableView ? <Eye className="w-4 h-4" /> : <Table className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
}

export function ProfitWaterfall({
  items,
  title = 'Project Profit Waterfall',
  subtitle,
  className = '',
  ariaLabel,
  showTableToggle = true,
}: ProfitWaterfallProps) {
  const [isTableView, setIsTableView] = useState(false);
  const computedSteps = computeWaterfallSteps(items);

  const accessibleLabel =
    ariaLabel ??
    `${title}: ${items.map((i) => `${i.label} (${formatMoney(BigInt(i.amountPaisa.toString()))})`).join(' -> ')}`;

  return (
    <div
      className={`card-workspace p-5 flex flex-col gap-4 ${className}`}
      role="region"
      aria-label={accessibleLabel}
    >
      <WaterfallHeader
        title={title}
        subtitle={subtitle}
        showTableToggle={showTableToggle}
        isTableView={isTableView}
        onToggleTableView={() => setIsTableView((prev) => !prev)}
      />

      {isTableView ? (
        <WaterfallTableView steps={computedSteps} />
      ) : (
        <WaterfallSvgView steps={computedSteps} />
      )}
    </div>
  );
}
