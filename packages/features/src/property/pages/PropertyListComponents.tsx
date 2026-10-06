import { Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Button,
  IconButton,
  Select,
  DataTableSkeleton,
  EmptyState,
  FilteredEmptyState,
  ErrorState,
} from '@exzaestate/ui';
import type { PropertyItem } from '../hooks/usePropertyList.js';
import { PropertyDataTable } from '../components/PropertyDataTable.js';
import { PropertyPlanView } from '../components/PropertyPlanView.js';
import { PROPERTY_TYPES, CANONICAL_PROPERTY_STATUSES } from '../schemas/property.schema.js';

export function exportPropertiesToCsv(properties: PropertyItem[]) {
  if (properties.length === 0) return;
  const headers = ['Unit Code', 'Title', 'Type', 'Status', 'Area Sqft', 'Net Price Paisa'];
  const rows = properties.map((p) => [
    `"${p.code}"`,
    `"${p.title ?? ''}"`,
    `"${p.type}"`,
    `"${p.status}"`,
    `"${p.areaSqft}"`,
    `"${p.netPricePaisa}"`,
  ]);
  const csvContent =
    'data:text/csv;charset=utf-8,' +
    [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const link = document.createElement('a');
  link.setAttribute('href', encodeURI(csvContent));
  link.setAttribute('download', `exza_inventory_export_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function PaginationBar({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
}: {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
}) {
  if (total <= limit) return null;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="p-3 border-t border-border bg-surface flex items-center justify-between text-small text-text-muted">
      <span>
        Showing {start}–{end} of {total} units
      </span>
      <div className="flex items-center gap-2">
        <IconButton
          variant="secondary"
          size="sm"
          icon={<ChevronLeft className="w-4 h-4" />}
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          aria-label="Previous page"
        />
        <span className="font-medium text-text">
          Page {page} of {totalPages}
        </span>
        <IconButton
          variant="secondary"
          size="sm"
          icon={<ChevronRight className="w-4 h-4" />}
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          aria-label="Next page"
        />
      </div>
    </div>
  );
}

const STATUS_CHIPS = [
  { label: 'All Units', value: '' },
  { label: 'Available', value: 'AVAILABLE' },
  { label: 'Reserved', value: 'RESERVED' },
  { label: 'Booked', value: 'BOOKED' },
  { label: 'Sold', value: 'SOLD' },
  { label: 'Hold / Blocked', value: 'HOLD' },
];

export interface PropertyListFiltersProps {
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
    <div className="p-4 border-b border-border bg-surface-sunken/20 space-y-3">
      {/* Top Filter Row: Search & Dropdowns */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-56">
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
            leftIcon={<X className="w-3.5 h-3.5" />}
            onClick={onClearFilters}
            className="text-text-muted hover:text-text text-small"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Fast Preset Status Filter Pills */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-caption font-medium text-text-muted mr-1">Quick Filter:</span>
        {STATUS_CHIPS.map((chip) => {
          const isSelected = statusFilter === chip.value;
          return (
            <button
              key={chip.label}
              type="button"
              onClick={() => onStatusChange(chip.value)}
              className={`px-2.5 py-1 rounded-full text-caption font-medium transition-all duration-150 cursor-pointer ${
                isSelected
                  ? 'bg-primary text-on-primary shadow-xs font-semibold'
                  : 'bg-surface hover:bg-surface-sunken text-text-2 border border-border hover:border-border-input'
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export interface PropertyListContentProps {
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
