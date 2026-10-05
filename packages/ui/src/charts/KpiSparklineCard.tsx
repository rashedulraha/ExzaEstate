import { useState } from 'react';
import { scaleLinear } from 'd3-scale';
import { line, curveLinear } from 'd3-shape';
import { Table, Eye } from 'lucide-react';
import type { ChartBaseProps, SparklinePoint } from './types.js';

export interface KpiSparklineCardProps extends ChartBaseProps {
  label: string;
  value: string;
  subvalue?: string;
  sparklineData?: SparklinePoint[];
  trend?: {
    percentage: number;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
  indicatorColor?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
}

function getTrendColor(direction: string): string {
  if (direction === 'up') return 'text-success';
  if (direction === 'down') return 'text-danger';
  return 'text-text-muted';
}

function getTrendSign(direction: string): string {
  if (direction === 'up') return '+';
  if (direction === 'down') return '-';
  return '';
}

function computeSparkline(
  sparklineData: SparklinePoint[],
  width: number,
  height: number,
  padding: number,
) {
  if (sparklineData.length <= 1) {
    return { pathData: '', endPoint: null };
  }

  const minVal = Math.min(...sparklineData.map((d) => d.value));
  const maxVal = Math.max(...sparklineData.map((d) => d.value));
  const range = maxVal - minVal || 1;

  const xScale = scaleLinear()
    .domain([0, sparklineData.length - 1])
    .range([padding, width - padding]);

  const yScale = scaleLinear()
    .domain([minVal - range * 0.05, maxVal + range * 0.05])
    .range([height - padding, padding]);

  const lineGenerator = line<SparklinePoint>()
    .x((_, i) => xScale(i))
    .y((d) => yScale(d.value))
    .curve(curveLinear);

  const pathData = lineGenerator(sparklineData) ?? '';

  const lastIdx = sparklineData.length - 1;
  const lastData = sparklineData[lastIdx];
  const endPoint = lastData ? { x: xScale(lastIdx), y: yScale(lastData.value) } : null;

  return { pathData, endPoint };
}

function SparklineTableView({ sparklineData }: { sparklineData: SparklinePoint[] }) {
  return (
    <div className="my-2 max-h-24 overflow-y-auto border border-border rounded text-caption">
      <table className="w-full text-left">
        <thead className="bg-surface-sunken text-text-muted border-b border-border">
          <tr>
            <th className="px-2 py-1">Period</th>
            <th className="px-2 py-1 text-right">Value</th>
          </tr>
        </thead>
        <tbody>
          {sparklineData.map((d, i) => (
            <tr key={i} className="border-b border-border/50">
              <td className="px-2 py-0.5">{d.label ?? d.date}</td>
              <td className="px-2 py-0.5 text-right font-mono tabular-nums">
                {d.value.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function KpiCardHeader({
  label,
  showTableToggle,
  hasSparkline,
  isTableView,
  onToggleTableView,
}: {
  label: string;
  showTableToggle: boolean;
  hasSparkline: boolean;
  isTableView: boolean;
  onToggleTableView: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 mb-2">
      <span className="text-caption font-semibold tracking-wide uppercase text-text-muted">
        {label}
      </span>
      {showTableToggle && hasSparkline && (
        <button
          type="button"
          onClick={onToggleTableView}
          className="p-1 rounded text-text-muted hover:text-text hover:bg-surface-sunken cursor-pointer transition-colors"
          title={isTableView ? 'View sparkline' : 'View as table'}
          aria-label={isTableView ? 'View sparkline' : 'View as table'}
        >
          {isTableView ? <Eye className="w-3.5 h-3.5" /> : <Table className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  );
}

function KpiCardBody({
  value,
  subvalue,
  trend,
  sparklineData,
  activeStroke,
  width,
  height,
  pathData,
  endPoint,
}: {
  value: string;
  subvalue?: string;
  trend?: KpiSparklineCardProps['trend'];
  sparklineData: SparklinePoint[];
  activeStroke: string;
  width: number;
  height: number;
  pathData: string;
  endPoint: { x: number; y: number } | null;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mt-1">
      <div>
        <div className="text-[32px] font-semibold tracking-tight text-text leading-none font-mono tabular-nums">
          {value}
        </div>
        {subvalue && (
          <div className="text-small text-text-muted mt-1.5 font-medium">{subvalue}</div>
        )}
        {trend && (
          <div className="flex items-center gap-1.5 mt-2 text-caption">
            <span
              className={`font-semibold font-mono tabular-nums ${getTrendColor(trend.direction)}`}
            >
              {getTrendSign(trend.direction)}
              {Math.abs(trend.percentage)}%
            </span>
            {trend.label && <span className="text-text-muted">{trend.label}</span>}
          </div>
        )}
      </div>

      {sparklineData.length > 1 && (
        <div className="shrink-0 flex items-center justify-end">
          <svg width={width} height={height} className="overflow-visible" aria-hidden="true">
            <path
              d={pathData}
              fill="none"
              stroke={activeStroke}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {endPoint && <circle cx={endPoint.x} cy={endPoint.y} r="3.5" fill={activeStroke} />}
          </svg>
        </div>
      )}
    </div>
  );
}

export function KpiSparklineCard({
  label,
  value,
  subvalue,
  sparklineData = [],
  trend,
  indicatorColor = 'primary',
  className = '',
  ariaLabel,
  showTableToggle = true,
}: KpiSparklineCardProps) {
  const [isTableView, setIsTableView] = useState(false);

  const strokeColors: Record<string, string> = {
    primary: 'var(--color-primary-fg, #1a1a2e)',
    success: 'var(--color-success, #197444)',
    warning: 'var(--color-warning, #7c6200)',
    danger: 'var(--color-danger, #b83429)',
    info: 'var(--color-info, #2563b1)',
  };

  const activeStroke = strokeColors[indicatorColor] ?? 'var(--color-primary-fg, #1a1a2e)';
  const width = 160;
  const height = 48;
  const padding = 4;

  const { pathData, endPoint } = computeSparkline(sparklineData, width, height, padding);
  const accessibleText = ariaLabel ?? `${label}: ${value} ${subvalue ? `(${subvalue})` : ''}`;

  return (
    <div
      className={`card-workspace flex flex-col justify-between p-5 relative overflow-hidden ${className}`}
      role="region"
      aria-label={accessibleText}
    >
      <KpiCardHeader
        label={label}
        showTableToggle={showTableToggle}
        hasSparkline={sparklineData.length > 0}
        isTableView={isTableView}
        onToggleTableView={() => setIsTableView((prev) => !prev)}
      />

      {isTableView ? (
        <SparklineTableView sparklineData={sparklineData} />
      ) : (
        <KpiCardBody
          value={value}
          subvalue={subvalue}
          trend={trend}
          sparklineData={sparklineData}
          activeStroke={activeStroke}
          width={width}
          height={height}
          pathData={pathData}
          endPoint={endPoint}
        />
      )}
    </div>
  );
}
