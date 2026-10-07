import { StatusBadge, Button } from '@exzaestate/ui';
import { formatMoney, formatArea, cleanEnglishText } from '@exzaestate/shared';
import { Building2, Check, X } from 'lucide-react';
import type { PropertyItem } from '../../../../property/hooks/usePropertyList.js';

export function getOrdinalSuffix(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return 'st';
  }
  if (mod10 === 2 && mod100 !== 12) {
    return 'nd';
  }
  if (mod10 === 3 && mod100 !== 13) {
    return 'rd';
  }
  return 'th';
}

export function formatBlock(block?: { code?: string; name?: string } | null): string {
  if (!block) return '';
  if (block.code && /^TWR-(\d+)$/i.test(block.code)) {
    const num = block.code.match(/^TWR-(\d+)$/i)?.[1];
    return `Tower ${num}`;
  }
  return cleanEnglishText(block.name, block.code || '');
}

export function formatFloor(
  floor?: {
    code?: string;
    name?: string;
    floorNumber?: number | null;
  } | null,
): string {
  if (!floor) {
    return '';
  }
  if (floor.floorNumber !== null && floor.floorNumber !== undefined) {
    if (floor.floorNumber === 0) {
      return 'Ground Floor';
    }
    return `${floor.floorNumber}${getOrdinalSuffix(floor.floorNumber)} Floor`;
  }
  return cleanEnglishText(floor.name, floor.code || '');
}

export function SelectedUnitBanner({
  selectedUnit,
  propertyCode,
  propertyId,
  onClear,
}: {
  selectedUnit: PropertyItem | null;
  propertyCode?: string;
  propertyId: string;
  onClear: () => void;
}) {
  const displayCode = selectedUnit?.code || propertyCode || propertyId;
  return (
    <div className="p-4 bg-surface rounded-card border-2 border-primary/60 bg-gradient-to-r from-primary/5 to-transparent relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
            <Check className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-h4 font-bold text-text">{displayCode}</span>
              <StatusBadge domain="property" value="Available" />
              {selectedUnit && (
                <span className="text-caption font-medium uppercase px-2 py-0.5 rounded-full bg-surface-sunken text-text-2 border border-border">
                  {selectedUnit.type}
                </span>
              )}
            </div>
            {selectedUnit && (
              <p className="text-caption text-text-muted mt-0.5">
                {formatBlock(selectedUnit.block)} · {formatFloor(selectedUnit.floor)} ·{' '}
                {formatArea(selectedUnit.areaSqft, 'sqft')} (
                {formatArea(selectedUnit.areaSqft, 'katha')})
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center sm:flex-col sm:items-end justify-between gap-1">
          {selectedUnit && (
            <span className="text-body font-bold text-primary tabular-nums">
              {formatMoney(selectedUnit.netPricePaisa)}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<X className="w-3.5 h-3.5" />}
            onClick={onClear}
            className="text-text-muted hover:text-text text-caption"
          >
            Change Unit
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AvailableUnitsList({
  isLoading,
  filteredUnits,
  searchTerm,
  onSelectUnit,
}: {
  isLoading: boolean;
  filteredUnits: PropertyItem[];
  searchTerm: string;
  onSelectUnit: (unit: PropertyItem) => void;
}) {
  if (isLoading) {
    return (
      <div className="p-8 text-center text-text-muted text-small border border-border rounded-card bg-surface-sunken/20">
        Loading available properties...
      </div>
    );
  }

  if (filteredUnits.length === 0) {
    return (
      <div className="p-8 text-center border border-dashed border-border rounded-card bg-surface/20 space-y-1">
        <Building2 className="w-8 h-8 mx-auto text-text-disabled" />
        <p className="text-small font-medium text-text">No available units found</p>
        <p className="text-caption text-text-muted">
          {searchTerm
            ? 'No units match your search keyword.'
            : 'There are currently no Available units in the inventory.'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto p-0.5">
      {filteredUnits.map((unit) => {
        const blockDisplay = formatBlock(unit.block);
        const floorDisplay = formatFloor(unit.floor);
        return (
          <button
            key={unit.id}
            type="button"
            onClick={() => onSelectUnit(unit)}
            className="p-3 border border-border bg-surface hover:border-primary/60 hover:bg-surface-sunken/40 rounded-card text-left transition-all cursor-pointer group flex flex-col justify-between gap-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-body font-semibold text-text group-hover:text-primary transition-colors">
                {unit.code}
              </span>
              <span className="text-caption font-medium uppercase px-2 py-0.5 rounded-full bg-surface-sunken text-text-2 border border-border">
                {unit.type}
              </span>
            </div>

            <div className="text-caption text-text-muted">
              {blockDisplay && `${blockDisplay} · `}
              {floorDisplay && `${floorDisplay} · `}
              {formatArea(unit.areaSqft, 'sqft')}
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-border/50">
              <span className="text-caption font-bold text-text tabular-nums">
                {formatMoney(unit.netPricePaisa)}
              </span>
              <span className="text-caption font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                Select →
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
