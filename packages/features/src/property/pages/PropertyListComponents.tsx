import { Building, CheckCircle2, Clock, Layers, Search, X } from 'lucide-react';
import {
  Button,
  Select,
  DataTableSkeleton,
  EmptyState,
  FilteredEmptyState,
  ErrorState,
} from '@exzaestate/ui';
import type { PropertyItem, PropertyKpiSummary } from '../hooks/usePropertyList.js';
import { PropertyDataTable } from '../components/PropertyDataTable.js';
import { PropertyPlanView } from '../components/PropertyPlanView.js';
import { PROPERTY_TYPES, CANONICAL_PROPERTY_STATUSES } from '../schemas/property.schema.js';

export function PropertyKpiCards({ kpis }: { kpis: PropertyKpiSummary }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="card-stat flex items-start justify-between">
        <div>
          <p className="text-th">Total Units</p>
          <p className="text-hero-num text-text mt-1">{kpis.totalUnits}</p>
          <p className="text-caption text-text-muted mt-1">Full Portfolio Volume</p>
        </div>
        <div className="p-2.5 bg-primary/12 text-primary rounded-button">
          <Building className="w-5 h-5" />
        </div>
      </div>

      <div className="card-stat flex items-start justify-between">
        <div>
          <p className="text-th">Available</p>
          <p className="text-hero-num text-success mt-1">{kpis.availableCount}</p>
          <p className="text-caption text-text-muted mt-1">Ready for Quotation & Sale</p>
        </div>
        <div className="p-2.5 bg-success/12 text-success rounded-button">
          <CheckCircle2 className="w-5 h-5" />
        </div>
      </div>

      <div className="card-stat flex items-start justify-between">
        <div>
          <p className="text-th">Reserved & Booked</p>
          <p className="text-hero-num text-warning mt-1">{kpis.reservedCount}</p>
          <p className="text-caption text-text-muted mt-1">In Sales Pipeline</p>
        </div>
        <div className="p-2.5 bg-warning/12 text-warning rounded-button">
          <Clock className="w-5 h-5" />
        </div>
      </div>

      <div className="card-stat flex items-start justify-between">
        <div>
          <p className="text-th">Sold Units</p>
          <p className="text-hero-num text-primary mt-1">{kpis.soldCount}</p>
          <p className="text-caption text-text-muted mt-1">Deeds & Handover Active</p>
        </div>
        <div className="p-2.5 bg-surface-sunken text-text rounded-button border border-border">
          <Layers className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

interface PropertyListFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  typeFilter: string;
  onTypeChange: (value: string) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

export function PropertyListFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  typeFilter,
  onTypeChange,
  hasActiveFilters,
  onClearFilters,
}: PropertyListFiltersProps) {
  return (
    <div className="p-4 border-b border-border bg-surface-sunken/20 flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[220px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          placeholder="Search unit code or title..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full h-9 pl-9 pr-3 text-small rounded-button bg-surface border border-border-input text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-focus focus:border-focus"
        />
      </div>

      <div className="w-40">
        <Select
          value={statusFilter}
          onChange={onStatusChange}
          options={[
            { label: 'All Statuses', value: '' },
            ...CANONICAL_PROPERTY_STATUSES.map((s) => ({ label: s, value: s })),
          ]}
        />
      </div>

      <div className="w-40">
        <Select
          value={typeFilter}
          onChange={onTypeChange}
          options={[
            { label: 'All Types', value: '' },
            ...PROPERTY_TYPES.map((t) => ({ label: t, value: t })),
          ]}
        />
      </div>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="md"
          onClick={onClearFilters}
          className="text-text-muted hover:text-text text-small"
        >
          <X className="w-3.5 h-3.5 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}

interface PropertyListContentProps {
  isLoading: boolean;
  isError: boolean;
  properties: PropertyItem[];
  hasActiveFilters: boolean;
  viewMode: 'table' | 'plan';
  canCreate: boolean;
  selectedPropertyId?: string;
  onRetry: () => void;
  onClearFilters: () => void;
  onCreateProperty: () => void;
  onSelectProperty: (property: PropertyItem) => void;
  onEditProperty: (property: PropertyItem) => void;
  onOverrideStatus: (property: PropertyItem) => void;
}

export function PropertyListContent({
  isLoading,
  isError,
  properties,
  hasActiveFilters,
  viewMode,
  canCreate,
  selectedPropertyId,
  onRetry,
  onClearFilters,
  onCreateProperty,
  onSelectProperty,
  onEditProperty,
  onOverrideStatus,
}: PropertyListContentProps) {
  if (isLoading) {
    return (
      <div className="p-4">
        <DataTableSkeleton rows={8} cols={7} />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Unable to load property inventory"
        message="A network or service error occurred while retrieving properties from the database."
        onRetry={onRetry}
      />
    );
  }

  if (properties.length === 0) {
    if (hasActiveFilters) {
      return <FilteredEmptyState onResetFilters={onClearFilters} />;
    }
    return (
      <EmptyState
        title="No properties found in project"
        description="Your project has no property units yet. Add your first plot, flat, shop, or commercial office unit to begin building quotations."
        actionLabel={canCreate ? '+ Add First Property' : undefined}
        onAction={canCreate ? onCreateProperty : undefined}
      />
    );
  }

  if (viewMode === 'table') {
    return (
      <PropertyDataTable
        properties={properties}
        isLoading={isLoading}
        onSelectProperty={onSelectProperty}
        onEditProperty={onEditProperty}
        onOverrideStatus={onOverrideStatus}
        selectedPropertyId={selectedPropertyId}
      />
    );
  }

  return (
    <PropertyPlanView
      properties={properties}
      isLoading={isLoading}
      onSelectProperty={onSelectProperty}
      selectedPropertyId={selectedPropertyId}
    />
  );
}
