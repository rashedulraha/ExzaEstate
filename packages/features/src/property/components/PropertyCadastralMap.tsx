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
          className="space-y-6 min-w-max mx-auto origin-top transition-transform"
          style={{ transform: `scale(${zoom})` }}
        >
          {blockGroups.map(([blockName, blockUnits]) => (
            <div
              key={blockName}
              className="bg-surface-sunken/50 rounded-card border border-border p-4 shadow-xs space-y-3"
            >
              {/* Sector / Road Arterial Header */}
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-button bg-surface flex items-center justify-center text-text-muted border border-border">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-small font-semibold text-text uppercase tracking-wider">
                    {blockName}
                  </span>
                  <span className="text-caption font-bold px-2 py-0.5 rounded-full bg-surface text-text-muted border border-border">
                    {blockUnits.length} Units
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-caption text-text-muted">
                  <span className="w-12 h-1 bg-border rounded-full" />
                  <span>Main Corridor</span>
                </div>
              </div>

              {/* Spatial Plots Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {blockUnits.map((prop) => {
                  const isSelected = selectedPropertyId === prop.id;

                  return (
                    <button
                      key={prop.id}
                      type="button"
                      onClick={() => onSelectProperty(prop)}
                      className={`group relative text-left p-3 rounded-card border transition-all duration-150 cursor-pointer space-y-2 shadow-xs hover:shadow-md bg-surface hover:bg-surface-elevated/80 ${
                        isSelected
                          ? 'border-primary ring-1 ring-primary/40 bg-surface-elevated'
                          : 'border-border hover:border-primary/50'
                      } ${prop.status.toUpperCase() === 'SOLD' ? 'opacity-80' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-small font-semibold text-text group-hover:text-primary transition-colors truncate">
                          {prop.code}
                        </span>
                        <StatusBadge domain="property" value={prop.status} />
                      </div>

                      <div className="flex items-center justify-between text-caption text-text-muted">
                        <span className="truncate">{prop.title || prop.type}</span>
                        <span className="font-mono text-text-2 font-medium shrink-0">
                          {formatArea(prop.areaSqft, 'sqft')}
                        </span>
                      </div>

                      <div className="text-caption font-mono text-text-2 font-medium bg-surface-sunken/50 px-2 py-0.5 rounded border border-border/50 truncate flex items-center justify-between">
                        <span className="text-text-muted text-[10px] uppercase tracking-wider font-sans">
                          Price
                        </span>
                        <span className="tabular-nums font-semibold">
                          {formatMoney(prop.netPricePaisa)}
                        </span>
                      </div>

                      {prop.facing && (
                        <div className="pt-1.5 border-t border-border flex items-center gap-1 text-caption text-text-muted truncate">
                          <Compass className="w-3 h-3 text-text-muted/80 shrink-0" />
                          <span className="font-medium uppercase tracking-wider truncate">
                            {prop.facing.replace('_', ' ')}
                          </span>
                        </div>
                      )}
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
