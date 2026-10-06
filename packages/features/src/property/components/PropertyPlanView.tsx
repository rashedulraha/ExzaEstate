import { useState, useMemo } from 'react';
import { Layers, Map, Search, CheckCircle2 } from 'lucide-react';
import type { PropertyItem } from '../hooks/usePropertyList.js';
import { PropertyStackingPlan } from './PropertyStackingPlan.js';
import { PropertyCadastralMap } from './PropertyCadastralMap.js';

export interface PropertyPlanViewProps {
  properties: PropertyItem[];
  isLoading: boolean;
  onSelectProperty: (property: PropertyItem) => void;
  selectedPropertyId?: string;
  emptyState?: React.ReactNode;
}

export function PropertyPlanView({
  properties,
  isLoading,
  onSelectProperty,
  selectedPropertyId,
  emptyState,
}: PropertyPlanViewProps) {
  const [subMode, setSubMode] = useState<'stacking' | 'cadastral'>('stacking');
  const [unitSearch, setUnitSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  const filteredProperties = useMemo(() => {
    let result = properties;
    if (unitSearch.trim()) {
      const q = unitSearch.toLowerCase().trim();
      result = result.filter(
        (p) => p.code.toLowerCase().includes(q) || (p.title && p.title.toLowerCase().includes(q)),
      );
    }
    if (selectedStatus) {
      result = result.filter((p) => p.status.toUpperCase() === selectedStatus);
    }
    return result;
  }, [properties, unitSearch, selectedStatus]);

  if (isLoading) {
    return (
      <div className="w-full h-96 flex flex-col items-center justify-center bg-surface-sunken/30 rounded-card border border-border animate-skeleton-breathe">
        <div className="w-12 h-12 rounded-full bg-surface-sunken mb-3" />
        <p className="text-small text-text-muted font-medium">
          Generating Architectural Plan & Stacking View...
        </p>
      </div>
    );
  }

  if (properties.length === 0) {
    return <div className="p-8 text-center">{emptyState}</div>;
  }

  const availableCount = properties.filter((p) => p.status.toUpperCase() === 'AVAILABLE').length;

  return (
    <div className="space-y-4" aria-label="Master Plan View for Property Inventory">
      {/* Plan View Secondary Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-surface rounded-card border border-border shadow-xs">
        {/* Left: Mode Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-surface-sunken p-0.5 rounded-button border border-border">
            <button
              type="button"
              onClick={() => setSubMode('stacking')}
              className={`flex items-center gap-1.5 px-3 py-1 text-btn rounded-button cursor-pointer transition-colors ${
                subMode === 'stacking'
                  ? 'bg-surface text-text shadow-xs font-semibold'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Building Stacking Plan</span>
            </button>
            <button
              type="button"
              onClick={() => setSubMode('cadastral')}
              className={`flex items-center gap-1.5 px-3 py-1 text-btn rounded-button cursor-pointer transition-colors ${
                subMode === 'cadastral'
                  ? 'bg-surface text-text shadow-xs font-semibold'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              <span>2D Cadastral Map</span>
            </button>
          </div>

          <span className="text-caption text-text-muted hidden sm:inline">
            Showing {filteredProperties.length} of {properties.length} units
          </span>
        </div>

        {/* Right: Quick Search and Availability Toggle */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Find unit code..."
              value={unitSearch}
              onChange={(e) => setUnitSearch(e.target.value)}
              className="h-8 pl-8 pr-3 text-caption rounded-button bg-surface-sunken border border-border-input text-text placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-focus w-36 sm:w-48"
            />
          </div>

          <button
            type="button"
            onClick={() => setSelectedStatus(selectedStatus === 'AVAILABLE' ? '' : 'AVAILABLE')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-caption rounded-button border transition-colors cursor-pointer ${
              selectedStatus === 'AVAILABLE'
                ? 'bg-success text-on-primary border-success font-semibold'
                : 'bg-surface-sunken hover:bg-surface text-text-2 border-border'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Available ({availableCount})</span>
          </button>
        </div>
      </div>

      {/* Main Visual Presentation */}
      {(() => {
        if (filteredProperties.length === 0) {
          return (
            <div className="p-12 text-center bg-surface rounded-card border border-border">
              <p className="text-body font-medium text-text">No units matched your plan filter</p>
              <p className="text-caption text-text-muted mt-1">
                Try adjusting your search query or reset the available status filter.
              </p>
              <button
                type="button"
                onClick={() => {
                  setUnitSearch('');
                  setSelectedStatus('');
                }}
                className="mt-3 px-3 py-1.5 text-btn text-primary bg-primary/10 rounded-button cursor-pointer hover:bg-primary/20"
              >
                Reset Filters
              </button>
            </div>
          );
        }
        if (subMode === 'stacking') {
          return (
            <PropertyStackingPlan
              properties={filteredProperties}
              selectedPropertyId={selectedPropertyId}
              onSelectProperty={onSelectProperty}
            />
          );
        }
        return (
          <PropertyCadastralMap
            properties={filteredProperties}
            selectedPropertyId={selectedPropertyId}
            onSelectProperty={onSelectProperty}
          />
        );
      })()}

      {/* Bottom Global Status Legend */}
      <div className="p-3 bg-surface rounded-card border border-border flex flex-wrap items-center justify-center gap-6 text-caption text-text-muted">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-button border border-success bg-success/20" />
          <span className="text-text-2 font-medium">Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-button border border-warning bg-warning/20" />
          <span className="text-text-2 font-medium">Reserved (Dotted)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-button border border-special bg-special/20" />
          <span className="text-text-2 font-medium">Booked (Diagonal)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-button border border-border-strong bg-secondary/50" />
          <span className="text-text font-medium">Sold (Solid)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-button border border-danger bg-danger/20" />
          <span className="text-text-2 font-medium">Hold / Blocked (Hatch)</span>
        </div>
      </div>
    </div>
  );
}
