import type { PlanViewPlot } from './types.js';

const statusColorMap: Record<string, { stroke: string; fill: string }> = {
  AVAILABLE: { stroke: '#197444', fill: 'transparent' },
  RESERVED: { stroke: '#7C6200', fill: 'url(#pattern-reserved-dots)' },
  BOOKED: { stroke: '#7A39E8', fill: 'url(#pattern-booked-hatch)' },
  SOLD: { stroke: '#1A1A2E', fill: '#1A1A2E' },
  HOLD: { stroke: '#5F6572', fill: 'url(#pattern-void-crosshatch)' },
  BLOCKED: { stroke: '#5F6572', fill: 'url(#pattern-void-crosshatch)' },
  CANCELLED: { stroke: '#5F6572', fill: 'transparent' },
  TRANSFERRED: { stroke: '#2563B1', fill: 'transparent' },
};

function getPlotStroke(
  isSelected: boolean,
  isFocused: boolean,
  isHovered: boolean,
  statusStroke: string,
): string {
  if (isSelected || isFocused || isHovered) {
    return '#1A1A2E';
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
    stroke: '#68686D',
    fill: 'transparent',
  };

  const stroke = getPlotStroke(isSelected, isFocused, isHovered, statusConfig.stroke);
  const strokeWidth = getPlotStrokeWidth(isSelected, isFocused, isHovered);
  const isSold = statusKey === 'SOLD';

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
      className="cursor-pointer transition-transform duration-75"
    >
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx="6"
        ry="6"
        stroke={stroke}
        strokeWidth={strokeWidth}
        fill={statusConfig.fill}
        className="transition-colors"
      />

      <rect
        x={x + width / 2 - 24}
        y={y + height / 2 - 11}
        width="48"
        height="22"
        rx="4"
        ry="4"
        fill="#FFFFFF"
        stroke={statusConfig.stroke}
        strokeWidth="0.5"
        opacity={isSold ? 0.95 : 0.9}
      />

      <text
        x={x + width / 2}
        y={y + height / 2 + 4}
        textAnchor="middle"
        fill="#1D1D1F"
        fontSize="11"
        fontWeight="600"
        fontFamily="Inter, sans-serif"
      >
        {plot.code}
      </text>

      {statusKey === 'TRANSFERRED' && (
        <polygon
          points={`${x + width - 10},${y} ${x + width},${y} ${x + width},${y + 10}`}
          fill="#2563B1"
        />
      )}

      {statusKey === 'CANCELLED' && (
        <line x1={x} y1={y} x2={x + width} y2={y + height} stroke="#5F6572" strokeWidth="1.5" />
      )}
    </g>
  );
}
