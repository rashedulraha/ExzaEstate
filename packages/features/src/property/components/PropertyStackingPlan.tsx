import { useMemo } from 'react';
import { Building2, Compass, Eye } from 'lucide-react';
import { formatMoney, formatArea } from '@exzaestate/shared';
import { StatusBadge } from '@exzaestate/ui';
import type { PropertyItem } from '../hooks/usePropertyList.js';

export interface PropertyStackingPlanProps {
  properties: PropertyItem[];
  selectedPropertyId?: string;
  onSelectProperty: (property: PropertyItem) => void;
}

interface FloorGroup {
  floorKey: string;
  floorLabel: string;
  floorNumber: number;
  properties: PropertyItem[];
  availableCount: number;
  reservedCount: number;
  soldCount: number;
  blockedCount: number;
}

function extractFloorMeta(prop: PropertyItem): { label: string; num: number } {
  if (prop.floor?.name) {
    const num = prop.floor.floorNumber ?? 0;
    return { label: prop.floor.name, num };
  }
  const match = prop.code.match(/(\d+)/);
  if (match && match[1]) {
    const n = parseInt(match[1], 10);
    return { label: `Level ${n}`, num: n };
  }
  return { label: 'Ground Level / General', num: 0 };
}

export function PropertyStackingPlan({
  properties,
  selectedPropertyId,
  onSelectProperty,
}: PropertyStackingPlanProps) {
  const floorGroups: FloorGroup[] = useMemo(() => {
    const map = new Map<string, FloorGroup>();

    for (const prop of properties) {
      const { label, num } = extractFloorMeta(prop);
      let group = map.get(label);
      if (!group) {
        group = {
          floorKey: label,
          floorLabel: label,
          floorNumber: num,
          properties: [],
          availableCount: 0,
          reservedCount: 0,
          soldCount: 0,
          blockedCount: 0,
        };
        map.set(label, group);
      }
      group.properties.push(prop);
      const s = prop.status.toUpperCase();
      if (s === 'AVAILABLE') group.availableCount++;
      else if (s === 'RESERVED' || s === 'BOOKED') group.reservedCount++;
      else if (s === 'SOLD') group.soldCount++;
      else if (s === 'HOLD' || s === 'BLOCKED') group.blockedCount++;
    }

    // Sort descending: top floor down to ground level
    return Array.from(map.values()).sort((a, b) => b.floorNumber - a.floorNumber);
  }, [properties]);

  return (
    <div className="space-y-4">
      {floorGroups.map((group) => {
        const total = group.properties.length || 1;
        const bookedOrSold = group.reservedCount + group.soldCount;
        const occupancyPct = Math.round((bookedOrSold / total) * 100);

        return (
          <div
            key={group.floorKey}
            className="p-3.5 bg-surface-sunken/50 rounded-card border border-border shadow-xs"
          >
            {/* Architectural Floor Header Strip */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-button bg-surface flex items-center justify-center text-text-muted border border-border">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-small font-semibold text-text uppercase tracking-wide">
                      {group.floorLabel}
                    </h3>
                    <span className="text-caption font-bold px-2 py-0.5 rounded-full bg-surface text-text-muted border border-border">
                      {group.properties.length} {group.properties.length === 1 ? 'Unit' : 'Units'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-caption text-text-muted mt-0.5">
                    <span>{group.availableCount} Available</span>
                    <span>·</span>
                    <span>{group.reservedCount} In Pipeline</span>
                    <span>·</span>
                    <span>{group.soldCount} Sold</span>
                  </div>
                </div>
              </div>

              {/* Floor Occupancy Mini Meter */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-caption font-medium text-text-muted">
                  Occupancy: <strong className="text-text font-mono">{occupancyPct}%</strong>
                </span>
                <div className="w-20 h-1.5 bg-surface rounded-full overflow-hidden border border-border/60">
                  <div
                    className="h-full bg-text-muted/60 rounded-full transition-all duration-300"
                    style={{ width: `${occupancyPct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Units on This Floor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {group.properties.map((prop) => {
                const isSelected = selectedPropertyId === prop.id;

                return (
                  <button
                    key={prop.id}
                    type="button"
                    onClick={() => onSelectProperty(prop)}
                    className={`group relative text-left p-3 bg-surface hover:bg-surface-elevated/80 rounded-card border transition-all duration-150 cursor-pointer space-y-2.5 shadow-xs hover:shadow-md ${
                      isSelected
                        ? 'border-primary ring-1 ring-primary/40 bg-surface-elevated'
                        : 'border-border hover:border-primary/50'
                    } ${prop.status.toUpperCase() === 'SOLD' ? 'opacity-80' : ''}`}
                  >
                    {/* Top Row: Unit Code & Status Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-small text-text group-hover:text-primary transition-colors truncate">
                        {prop.code}
                      </h4>
                      <StatusBadge domain="property" value={prop.status} />
                    </div>

                    {/* Middle: Type & Area */}
                    <div className="flex items-center justify-between text-caption text-text-muted">
                      <span className="truncate">{prop.title || prop.type}</span>
                      <span className="font-mono text-text-2 font-medium shrink-0">
                        {formatArea(prop.areaSqft, 'sqft')}
                      </span>
                    </div>

                    {/* Price: Sunken pill matching LeadCard budget box */}
                    <div className="text-caption font-mono text-text-2 font-medium bg-surface-sunken/50 px-2 py-1 rounded border border-border/50 truncate flex items-center justify-between">
                      <span className="text-text-muted text-[11px] uppercase tracking-wider font-sans">
                        Price
                      </span>
                      <span className="tabular-nums font-semibold">
                        {formatMoney(prop.netPricePaisa)}
                      </span>
                    </div>

                    {/* Bottom: Orientation & View Action */}
                    <div className="pt-2 border-t border-border flex items-center justify-between text-caption text-text-muted">
                      <div className="flex items-center gap-1.5 truncate">
                        {prop.facing && <Compass className="w-3 h-3 text-text-muted/80 shrink-0" />}
                        <span className="font-medium uppercase tracking-wider truncate">
                          {prop.facing ? prop.facing.replace('_', ' ') : prop.type}
                        </span>
                      </div>
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-text-muted group-hover:text-primary">
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
