import type { PlanViewPlot } from './types.js';

const statusColorMap: Record<string, { stroke: string; fill: string; chipStroke: string }> = {
  AVAILABLE: { stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.06)', chipStroke: '#10b981' },
  RESERVED: { stroke: '#f59e0b', fill: 'url(#pattern-reserved-dots)', chipStroke: '#f59e0b' },
  BOOKED: { stroke: '#8b5cf6', fill: 'url(#pattern-booked-hatch)', chipStroke: '#8b5cf6' },
  SOLD: { stroke: '#475569', fill: 'rgba(71, 85, 105, 0.28)', chipStroke: '#64748b' },
  HOLD: { stroke: '#64748b', fill: 'url(#pattern-void-crosshatch)', chipStroke: '#64748b' },
  BLOCKED: { stroke: '#ef4444', fill: 'url(#pattern-void-crosshatch)', chipStroke: '#ef4444' },
  CANCELLED: { stroke: '#64748b', fill: 'transparent', chipStroke: '#64748b' },
  TRANSFERRED: { stroke: '#3b82f6', fill: 'transparent', chipStroke: '#3b82f6' },
};

function getPlotStroke(
  isSelected: boolean,
  isFocused: boolean,
  isHovered: boolean,
  statusStroke: string,
): string {
  if (isSelected || isFocused || isHovered) {
    return '#F26522';
  }
  return statusStroke;
}

function getPlotStrokeWidth(isSelected: boolean, isFocused: boolean, isHovered: boolean): number {
  if (isSelected || isFocused) {
    return 2.5;
  }
  if (isHovered) {
    return 2;
  }
  return 1.5;
}

export interface PlotCellProps {
  plot: PlanViewPlot;
  isSelected: boolean;
  isFocused: boolean;
  isHovered: boolean;
  onClick?: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export function PlanViewPlotCell({
  plot,
  isSelected,
  isFocused,
  isHovered,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: PlotCellProps) {
  const statusKey = plot.status.toUpperCase();
  const statusConfig = statusColorMap[statusKey] ?? {
    stroke: '#64748b',
    fill: 'transparent',
    chipStroke: '#64748b',
  };

  const stroke = getPlotStroke(isSelected, isFocused, isHovered, statusConfig.stroke);
  const strokeWidth = getPlotStrokeWidth(isSelected, isFocused, isHovered);

  const x = plot.x ?? 0;
  const y = plot.y ?? 0;
  const width = plot.width ?? 90;
  const height = plot.height ?? 65;

  return (
    <g
      tabIndex={-1}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="cursor-pointer transition-transform duration-75 group"
    >
      {/* Outer Plot Boundary */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx="8"
        ry="8"
        stroke={stroke}
        strokeWidth={strokeWidth}
        fill={statusConfig.fill}
        className="transition-colors"
      />

      {/* Modern Theme-Aware Plot Number Chip */}
      <rect
        x={x + width / 2 - 27}
        y={y + height / 2 - 12}
        width="54"
        height="24"
        rx="5"
        ry="5"
        fill="var(--color-surface-elevated, #1a1a26)"
        stroke={
          isSelected || isHovered ? stroke : 'var(--color-border-strong, rgba(255,255,255,0.15))'
        }
        strokeWidth="1"
        className="transition-colors"
      />

      {/* Plot Number Typography */}
      <text
        x={x + width / 2}
        y={y + height / 2 + 4}
        textAnchor="middle"
        fill="var(--color-text, #f5f5f7)"
        fontSize="11"
        fontWeight="600"
        fontFamily="Inter, system-ui, sans-serif"
        className="select-none pointer-events-none tracking-tight"
      >
        {plot.code}
      </text>

      {statusKey === 'TRANSFERRED' && (
        <polygon
          points={`${x + width - 10},${y} ${x + width},${y} ${x + width},${y + 10}`}
          fill="#3b82f6"
        />
      )}

      {statusKey === 'CANCELLED' && (
        <line x1={x} y1={y} x2={x + width} y2={y + height} stroke="#64748b" strokeWidth="1.5" />
      )}
    </g>
  );
}
