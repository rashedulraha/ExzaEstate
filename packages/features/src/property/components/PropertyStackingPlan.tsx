import { useMemo } from 'react';
import { Building2, Compass, Eye, CheckCircle2, Clock } from 'lucide-react';
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

function getStatusBorderClass(status: string): string {
  const s = status.toUpperCase();
  switch (s) {
    case 'AVAILABLE':
      return 'border-t-2 border-t-success hover:border-success';
    case 'RESERVED':
      return 'border-t-2 border-t-warning hover:border-warning';
    case 'BOOKED':
      return 'border-t-2 border-t-special hover:border-special';
    case 'SOLD':
      return 'border-t-2 border-t-void/50 bg-surface-sunken/40';
    case 'HOLD':
    case 'BLOCKED':
      return 'border-t-2 border-t-danger hover:border-danger';
    default:
      return 'border-t-2 border-t-border';
  }
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
    <div className="space-y-6">
      {floorGroups.map((group) => {
        const total = group.properties.length || 1;
        const bookedOrSold = group.reservedCount + group.soldCount;
        const occupancyPct = Math.round((bookedOrSold / total) * 100);

        return (
          <div
            key={group.floorKey}
            className="p-4 bg-surface rounded-card border border-border shadow-xs"
          >
            {/* Architectural Floor Header Strip */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-button bg-surface-sunken flex items-center justify-center text-primary border border-border">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-body font-bold text-text uppercase tracking-wide">
                      {group.floorLabel}
                    </h3>
                    <span className="text-caption font-semibold px-2 py-0.5 rounded-full bg-surface-sunken text-text-2 border border-border">
                      {group.properties.length} {group.properties.length === 1 ? 'Unit' : 'Units'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-caption text-text-muted mt-0.5">
                    <span className="flex items-center gap-1 text-success font-medium">
                      <CheckCircle2 className="w-3 h-3" /> {group.availableCount} Available
                    </span>
                    {group.reservedCount > 0 && (
                      <span className="flex items-center gap-1 text-warning font-medium">
                        <Clock className="w-3 h-3" /> {group.reservedCount} In Pipeline
                      </span>
                    )}
                    {group.soldCount > 0 && (
                      <span className="flex items-center gap-1 text-text-2 font-medium">
                        ● {group.soldCount} Sold
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Floor Occupancy Mini Meter */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-caption font-medium text-text-muted">
                  Occupancy: <strong className="text-text">{occupancyPct}%</strong>
                </span>
                <div className="w-24 h-2 bg-surface-sunken rounded-full overflow-hidden border border-border">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${occupancyPct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Units on This Floor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {group.properties.map((prop) => {
                const isSelected = selectedPropertyId === prop.id;
                const borderClass = getStatusBorderClass(prop.status);

                return (
                  <button
                    key={prop.id}
                    type="button"
                    onClick={() => onSelectProperty(prop)}
                    className={`group relative text-left p-3.5 bg-surface hover:bg-surface-elevated rounded-card border transition-all duration-150 cursor-pointer shadow-xs hover:shadow-sm ${borderClass} ${
                      isSelected
                        ? 'ring-2 ring-focus border-focus bg-surface-elevated'
                        : 'border-border'
                    }`}
                  >
                    {/* Top Row: Unit Code & Status Badge */}
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <span className="text-body font-bold text-text group-hover:text-primary transition-colors">
                        {prop.code}
                      </span>
                      <StatusBadge domain="property" value={prop.status} />
                    </div>

                    {/* Middle: Type & Area */}
                    <div className="space-y-1 my-2 text-caption">
                      <div className="flex items-center justify-between text-text-2">
                        <span className="font-medium truncate">{prop.title || prop.type}</span>
                        <span className="text-text font-semibold tabular-nums">
                          {formatArea(prop.areaSqft, 'sqft')}
                        </span>
                      </div>
                      {prop.facing && (
                        <div className="flex items-center gap-1 text-text-muted">
                          <Compass className="w-3 h-3 text-text-muted" />
                          <span className="truncate">{prop.facing.replace('_', ' ')}</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom: Price & Quick Action */}
                    <div className="pt-2 border-t border-border flex items-center justify-between">
                      <span className="text-small font-bold text-primary tabular-nums">
                        {formatMoney(prop.netPricePaisa)}
                      </span>
                      <span className="text-caption text-text-muted opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                        <Eye className="w-3 h-3" /> View
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
