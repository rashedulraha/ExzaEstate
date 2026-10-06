import { useState, useMemo, useRef } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, MapPin, Compass } from 'lucide-react';
import { formatMoney, formatArea } from '@exzaestate/shared';
import { StatusBadge } from '@exzaestate/ui';
import type { PropertyItem } from '../hooks/usePropertyList.js';

export interface PropertyCadastralMapProps {
  properties: PropertyItem[];
  selectedPropertyId?: string;
  onSelectProperty: (property: PropertyItem) => void;
}

function getPlotStatusStyles(status: string): { border: string; bg: string; dot: string } {
  const s = status.toUpperCase();
  switch (s) {
    case 'AVAILABLE':
      return {
        border: 'border-success hover:border-success',
        bg: 'bg-surface hover:bg-success/5',
        dot: 'bg-success',
      };
    case 'RESERVED':
      return {
        border: 'border-warning hover:border-warning',
        bg: 'bg-surface hover:bg-warning/5',
        dot: 'bg-warning',
      };
    case 'BOOKED':
      return {
        border: 'border-special hover:border-special',
        bg: 'bg-surface hover:bg-special/5',
        dot: 'bg-special',
      };
    case 'SOLD':
      return {
        border: 'border-border-strong',
        bg: 'bg-surface-sunken opacity-75',
        dot: 'bg-text-muted',
      };
    case 'HOLD':
    case 'BLOCKED':
      return {
        border: 'border-danger hover:border-danger',
        bg: 'bg-surface hover:bg-danger/5',
        dot: 'bg-danger',
      };
    default:
      return {
        border: 'border-border',
        bg: 'bg-surface',
        dot: 'bg-text-muted',
      };
  }
}

export function PropertyCadastralMap({
  properties,
  selectedPropertyId,
  onSelectProperty,
}: PropertyCadastralMapProps) {
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Group properties by Block or Sector
  const blockGroups = useMemo(() => {
    const map = new Map<string, PropertyItem[]>();
    for (const p of properties) {
      const blockName = p.block?.name || 'Master Sector';
      const list = map.get(blockName) || [];
      list.push(p);
      map.set(blockName, list);
    }
    return Array.from(map.entries());
  }, [properties]);

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-surface-sunken/40 rounded-card border border-border p-4 overflow-hidden select-none"
    >
      {/* Zoom / Pan Toolbar */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1 bg-surface-elevated/95 backdrop-blur-sm p-1 rounded-button border border-border shadow-xs">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(1.8, +(z + 0.15).toFixed(2)))}
          className="p-1.5 text-text-muted hover:text-text rounded-button hover:bg-surface-sunken cursor-pointer transition-colors"
          aria-label="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <span className="text-caption font-semibold px-1 text-text-muted tabular-nums">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(0.65, +(z - 0.15).toFixed(2)))}
          className="p-1.5 text-text-muted hover:text-text rounded-button hover:bg-surface-sunken cursor-pointer transition-colors"
          aria-label="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setZoom(1)}
          className="p-1.5 text-text-muted hover:text-text rounded-button hover:bg-surface-sunken cursor-pointer transition-colors"
          aria-label="Reset zoom"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Cadastral Blueprint Canvas */}
      <div className="w-full overflow-auto max-h-160 p-4 transition-transform duration-100">
        <div
          className="space-y-8 min-w-max mx-auto origin-top transition-transform"
          style={{ transform: `scale(${zoom})` }}
        >
          {blockGroups.map(([blockName, blockUnits]) => (
            <div
              key={blockName}
              className="bg-surface rounded-card border border-border p-5 shadow-xs space-y-4"
            >
              {/* Sector / Road Arterial Header */}
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="text-small font-bold text-text uppercase tracking-wider">
                    {blockName}
                  </span>
                  <span className="text-caption text-text-muted">
                    ({blockUnits.length} Registered Units)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-caption text-text-muted">
                  <span className="w-16 h-1 bg-border rounded-full" />
                  <span>Main Arterial Road (40ft Corridor)</span>
                </div>
              </div>

              {/* Spatial Plots Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {blockUnits.map((prop) => {
                  const isSelected = selectedPropertyId === prop.id;
                  const style = getPlotStatusStyles(prop.status);

                  return (
                    <button
                      key={prop.id}
                      type="button"
                      onClick={() => onSelectProperty(prop)}
                      className={`text-left p-3 rounded-card border transition-all duration-150 cursor-pointer shadow-xs ${style.border} ${style.bg} ${
                        isSelected ? 'ring-2 ring-focus border-focus bg-surface-elevated' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="text-small font-bold text-text truncate">{prop.code}</span>
                        <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                      </div>

                      <div className="text-caption space-y-0.5 text-text-2">
                        <div className="font-medium text-text">
                          {formatArea(prop.areaSqft, 'sqft')}
                        </div>
                        {prop.facing && (
                          <div className="flex items-center gap-1 text-text-muted truncate">
                            <Compass className="w-3 h-3 shrink-0" />
                            <span>{prop.facing.replace('_', ' ')}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-2 pt-1.5 border-t border-border flex items-center justify-between">
                        <span className="text-caption font-bold text-primary tabular-nums">
                          {formatMoney(prop.netPricePaisa)}
                        </span>
                        <StatusBadge domain="property" value={prop.status} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
