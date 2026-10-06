import { useState } from 'react';
import { scaleLinear, scalePoint } from 'd3-scale';
import { line, area, curveMonotoneX } from 'd3-shape';
import { Table, Eye } from 'lucide-react';
import { formatMoney } from '@exzaestate/shared';
import type { CashFlowPoint, ChartBaseProps } from './types.js';

export interface CashFlowLineProps extends ChartBaseProps {
  data: CashFlowPoint[];
  height?: number;
}

function CashFlowTableView({ data }: { data: CashFlowPoint[] }) {
  return (
    <div className="border border-border rounded overflow-hidden">
      <table className="w-full text-left text-small">
        <thead className="bg-surface-sunken text-text-muted border-b border-border text-caption">
          <tr>
            <th className="px-3 py-2 font-medium">Period</th>
            <th className="px-3 py-2 text-right font-medium">Inflow</th>
            <th className="px-3 py-2 text-right font-medium">Outflow</th>
            <th className="px-3 py-2 text-right font-medium">Net Flow</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {data.map((d, i) => (
            <tr key={i}>
              <td className="px-3 py-2 font-medium text-text">{d.date}</td>
              <td className="px-3 py-2 text-right tabular-nums text-success">
                {formatMoney(BigInt(Math.round(d.inflow)))}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-danger">
                {formatMoney(BigInt(Math.round(d.outflow)))}
              </td>
              <td
                className={`px-3 py-2 text-right tabular-nums font-bold ${
                  d.net >= 0 ? 'text-success' : 'text-danger'
                }`}
              >
                {formatMoney(BigInt(Math.round(d.net)))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CashFlowSvgChart({ data, height }: { data: CashFlowPoint[]; height: number }) {
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;
  const svgWidth = 600;

  const minVal = Math.min(...data.map((d) => d.net), 0);
  const maxVal = Math.max(...data.map((d) => d.net), 100);
  const range = maxVal - minVal || 1;

  const xScale = scalePoint<string>()
    .domain(data.map((d) => d.date))
    .range([paddingLeft, svgWidth - paddingRight]);

  const yScale = scaleLinear()
    .domain([minVal - range * 0.05, maxVal + range * 0.05])
    .range([height - paddingBottom, paddingTop]);

  const lineGen = line<CashFlowPoint>()
    .x((d) => xScale(d.date) ?? 0)
    .y((d) => yScale(d.net))
    .curve(curveMonotoneX);

  const areaGen = area<CashFlowPoint>()
    .x((d) => xScale(d.date) ?? 0)
    .y0(yScale(0))
    .y1((d) => yScale(d.net))
    .curve(curveMonotoneX);

  const linePath = lineGen(data) ?? '';
  const areaPath = areaGen(data) ?? '';

  return (
    <div className="relative w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${svgWidth} ${height}`}
        className="w-full h-auto overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="cashflow-primary-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary-fg, #f26522)" stopOpacity="0.08" />
            <stop offset="100%" stopColor="var(--color-primary-fg, #f26522)" stopOpacity="0.00" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const yVal = minVal + range * pct;
          const yPos = yScale(yVal);
          return (
            <g key={pct}>
              <line
                x1={paddingLeft}
                y1={yPos}
                x2={svgWidth - paddingRight}
                y2={yPos}
                stroke="var(--color-border-subtle, rgba(0,0,0,0.04))"
                strokeWidth="1"
              />
              <text
                x={paddingLeft - 6}
                y={yPos + 3}
                textAnchor="end"
                className="text-caption tabular-nums fill-text-muted"
              >
                {formatMoney(BigInt(Math.round(yVal)))}
              </text>
            </g>
          );
        })}

        <line
          x1={paddingLeft}
          y1={yScale(0)}
          x2={svgWidth - paddingRight}
          y2={yScale(0)}
          stroke="var(--color-border-strong, rgba(0,0,0,0.12))"
          strokeWidth="1"
          strokeDasharray="2 2"
        />

        <path d={areaPath} fill="url(#cashflow-primary-gradient)" />

        <path
          d={linePath}
          fill="none"
          stroke="var(--color-primary-fg, #f26522)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {data.map((d, i) => {
          const cx = xScale(d.date) ?? 0;
          const cy = yScale(d.net);
          return (
            <g key={i}>
              <circle
                cx={cx}
                cy={cy}
                r="3.5"
                fill="var(--color-surface, #ffffff)"
                stroke="var(--color-primary-fg, #f26522)"
                strokeWidth="2"
              />
              <text
                x={cx}
                y={cy - 8}
                textAnchor="middle"
                className="text-caption tabular-nums font-semibold fill-text"
              >
                {formatMoney(BigInt(Math.round(d.net)))}
              </text>
              <text
                x={cx}
                y={height - paddingBottom + 16}
                textAnchor="middle"
                className="text-caption fill-text-muted"
              >
                {d.date}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function CashFlowHeader({
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
          title={isTableView ? 'View chart' : 'View as table'}
          aria-label={isTableView ? 'View chart' : 'View as table'}
        >
          {isTableView ? <Eye className="w-4 h-4" /> : <Table className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
}

function EmptyCashFlowState({ title, className = '' }: { title: string; className?: string }) {
  return (
    <div className={`card-workspace p-5 ${className}`}>
      <h4 className="text-body font-semibold text-text">{title}</h4>
      <div className="h-40 flex items-center justify-center text-text-muted text-small">
        Insufficient data to render cash flow chart.
      </div>
    </div>
  );
}

export function CashFlowLine({
  data,
  height = 240,
  title = 'Cash Flow Trend',
  subtitle,
  className = '',
  ariaLabel,
  showTableToggle = true,
}: CashFlowLineProps) {
  const [isTableView, setIsTableView] = useState(false);

  if (data.length < 2) {
    return <EmptyCashFlowState title={title} className={className} />;
  }

  const accessibleLabel =
    ariaLabel ?? `${title}: ${data.length} periods, latest net: ${data[data.length - 1]?.net ?? 0}`;

  return (
    <div
      className={`card-workspace p-5 flex flex-col gap-4 ${className}`}
      role="region"
      aria-label={accessibleLabel}
    >
      <CashFlowHeader
        title={title}
        subtitle={subtitle}
        showTableToggle={showTableToggle}
        isTableView={isTableView}
        onToggleTableView={() => setIsTableView((prev) => !prev)}
      />

      {isTableView ? (
        <CashFlowTableView data={data} />
      ) : (
        <CashFlowSvgChart data={data} height={height} />
      )}
    </div>
  );
}
