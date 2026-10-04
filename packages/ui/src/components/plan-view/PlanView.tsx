import { useState, useRef } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import type { PlanViewPlot, PlanViewProps } from './types.js';
import { PlanViewPlotCell } from './PlanViewPlotCell.js';

export type { PlanViewPlot, PlanViewProps };

export function PlanView({ plots, onPlotClick, selectedPlotId, className = '' }: PlanViewProps) {
  const [zoom, setZoom] = useState(1);
  const [hoveredPlot, setHoveredPlot] = useState<PlanViewPlot | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const cols = Math.ceil(Math.sqrt(plots.length)) || 4;
  const cellW = 90;
  const cellH = 65;
  const gap = 16;

  const resolvedPlots = plots.map((p, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    return {
      ...p,
      x: p.x ?? col * (cellW + gap) + 40,
      y: p.y ?? row * (cellH + gap) + 40,
      width: p.width ?? cellW,
      height: p.height ?? cellH,
    };
  });

  const svgWidth = Math.max(800, (cols + 1) * (cellW + gap) + 80);
  const svgHeight = Math.max(500, (Math.ceil(plots.length / cols) + 1) * (cellH + gap) + 80);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setFocusedIndex((prev) => Math.min(plots.length - 1, prev + 1));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setFocusedIndex((prev) => Math.max(0, prev - 1));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => Math.min(plots.length - 1, prev + cols));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => Math.max(0, prev - cols));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = resolvedPlots[focusedIndex];
      if (current) onPlotClick?.(current);
    }
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label="Master Plan View for Property Inventory"
      className={`relative w-full card-workspace bg-surface border border-border select-none outline-none focus-visible:ring-2 focus-visible:ring-focus ${className}`}
    >
      {/* Zoom / Pan Toolbar */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1 bg-surface-elevated/90 backdrop-blur p-1 rounded-button border border-border shadow-sm">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
          className="p-1.5 text-text-muted hover:text-text rounded hover:bg-surface-sunken cursor-pointer"
          aria-label="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
          className="p-1.5 text-text-muted hover:text-text rounded hover:bg-surface-sunken cursor-pointer"
          aria-label="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setZoom(1)}
          className="p-1.5 text-text-muted hover:text-text rounded hover:bg-surface-sunken cursor-pointer"
          aria-label="Reset Zoom"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* SVG Canvas */}
      <div className="w-full overflow-auto max-h-[640px] p-4 flex justify-center bg-surface-sunken/20">
        <svg
          width={svgWidth * zoom}
          height={svgHeight * zoom}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="transition-transform duration-100"
        >
          <defs>
            <pattern id="pattern-reserved-dots" width="8" height="8" patternUnits="userSpaceOnUse">
              <circle cx="4" cy="4" r="1.5" fill="#7C6200" opacity="0.4" />
            </pattern>
            <pattern
              id="pattern-booked-hatch"
              width="10"
              height="10"
              patternTransform="rotate(45 0 0)"
              patternUnits="userSpaceOnUse"
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="10"
                stroke="#7A39E8"
                strokeWidth="2.5"
                opacity="0.35"
              />
            </pattern>
            <pattern
              id="pattern-void-crosshatch"
              width="8"
              height="8"
              patternUnits="userSpaceOnUse"
            >
              <path d="M 0 0 L 8 8 M 8 0 L 0 8" stroke="#5F6572" strokeWidth="1" opacity="0.4" />
            </pattern>
          </defs>

          {/* Road guidelines */}
          <rect
            x={20}
            y={20}
            width={svgWidth - 40}
            height={svgHeight - 40}
            fill="none"
            stroke="#EDE4C8"
            strokeWidth="1"
            strokeDasharray="4 4"
          />

          {/* Plots */}
          {resolvedPlots.map((plot, idx) => (
            <PlanViewPlotCell
              key={plot.id}
              plot={plot}
              isSelected={selectedPlotId === plot.id}
              isFocused={focusedIndex === idx}
              isHovered={hoveredPlot?.id === plot.id}
              onClick={() => onPlotClick?.(plot)}
              onMouseEnter={() => setHoveredPlot(plot)}
              onMouseLeave={() => setHoveredPlot(null)}
            />
          ))}
        </svg>
      </div>

      {/* Floating Hover Card */}
      {hoveredPlot && (
        <div className="absolute bottom-16 left-6 z-20 p-3 bg-surface-elevated/95 backdrop-blur border border-border-strong rounded-card shadow-md text-small space-y-1 min-w-[200px] animate-in fade-in-50 duration-75">
          <div className="flex items-center justify-between border-b border-border pb-1">
            <span className="font-semibold text-text">{hoveredPlot.code}</span>
            <span className="text-caption font-medium uppercase px-1.5 py-0.2 rounded bg-surface-sunken">
              {hoveredPlot.status}
            </span>
          </div>
          {hoveredPlot.sizeSqFt && (
            <p className="text-text-muted">
              Size: <span className="text-text font-medium">{hoveredPlot.sizeSqFt} sq ft</span>
              {hoveredPlot.katha ? ` (${hoveredPlot.katha} katha)` : ''}
            </p>
          )}
          {hoveredPlot.facing && (
            <p className="text-text-muted">
              Facing: <span className="text-text font-medium">{hoveredPlot.facing}</span>
            </p>
          )}
          {hoveredPlot.priceFormatted && (
            <p className="text-text-muted">
              Price:{' '}
              <span className="text-text font-semibold tabular-nums">
                {hoveredPlot.priceFormatted}
              </span>
            </p>
          )}
        </div>
      )}

      {/* Bottom Status Legend */}
      <div className="p-3 border-t border-border bg-surface flex flex-wrap items-center justify-center gap-4 text-caption text-text-muted">
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded border border-success" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded border border-warning bg-warning/20" />
          <span>Reserved (Dotted)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded border border-special bg-special/20" />
          <span>Booked (Diagonal)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-primary" />
          <span className="text-text">Sold (Solid)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded border border-void bg-void/20" />
          <span>Hold / Blocked (Hatch)</span>
        </div>
      </div>
    </div>
  );
}
