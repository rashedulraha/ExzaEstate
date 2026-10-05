import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  Table as TableIcon,
  Map as MapIcon,
  Plus,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Breadcrumbs, Button, IconButton } from '@exzaestate/ui';
import { usePermission } from '@exzaestate/app-core';
import { PERMISSIONS } from '@exzaestate/shared';
import { usePropertyList, type PropertyItem } from '../hooks/usePropertyList.js';
import { usePropertyActions } from '../hooks/usePropertyActions.js';
import { PropertyDrawer } from '../components/PropertyDrawer.js';
import { PropertyFormModal } from '../components/PropertyFormModal.js';
import { PropertyStatusOverrideModal } from '../components/PropertyStatusOverrideModal.js';
import type { CanonicalPropertyStatusEnum, PropertyTypeEnum } from '../schemas/property.schema.js';
import {
  PropertyKpiCards,
  PropertyListFilters,
  PropertyListContent,
} from './PropertyListComponents.js';

export function PropertyListPage() {
  const navigate = useNavigate();
  const { hasPermission: canCreate } = usePermission(PERMISSIONS.PROPERTY_CREATE);

  // View switch: table vs plan view
  const [viewMode, setViewMode] = useState<'table' | 'plan'>('table');
  const [showFilters, setShowFilters] = useState(true);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const limit = 25;

  const queryParams = useMemo(() => {
    const status = statusFilter ? (statusFilter as CanonicalPropertyStatusEnum) : undefined;
    const type = typeFilter ? (typeFilter as PropertyTypeEnum) : undefined;
    return {
      search: search.trim() || undefined,
      status,
      type,
      page,
      limit,
    };
  }, [search, statusFilter, typeFilter, page, limit]);

  const { properties, total, totalPages, kpis, isLoading, isError, refetch } = usePropertyList({
    params: queryParams,
  });

  const { releaseHold, unblockProperty } = usePropertyActions();

  // Selection & Modal States
  const [selectedProperty, setSelectedProperty] = useState<PropertyItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<PropertyItem | null>(null);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideTargetProperty, setOverrideTargetProperty] = useState<PropertyItem | null>(null);

  const handleSelectProperty = (property: PropertyItem) => {
    setSelectedProperty(property);
    setIsDrawerOpen(true);
  };

  const handleEditProperty = (property: PropertyItem) => {
    setEditingProperty(property);
    setIsFormModalOpen(true);
  };

  const handleCreateProperty = () => {
    setEditingProperty(null);
    setIsFormModalOpen(true);
  };

  const handleOverrideStatus = (property: PropertyItem) => {
    setOverrideTargetProperty(property);
    setIsOverrideModalOpen(true);
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setTypeFilter('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(search || statusFilter || typeFilter);

  return (
    <div className="container-page space-y-6">
      {/* TIER 1: PAGE HEADER ROW */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Breadcrumbs
            items={[{ label: 'Overview', href: '/' }, { label: 'Property Inventory' }]}
          />
          <div className="flex items-center gap-3 mt-1.5">
            <h1 className="text-h1 font-semibold text-text">Property Inventory</h1>
            <span className="text-caption font-semibold px-2 py-0.5 rounded-full bg-surface-sunken text-text-2 border border-border">
              {total} {total === 1 ? 'Unit' : 'Units'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Table / Plan View Toggle */}
          <div className="flex items-center bg-surface-sunken p-0.5 rounded-button border border-border">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-btn rounded-button cursor-pointer transition-colors ${
                viewMode === 'table'
                  ? 'bg-surface text-text shadow-sm'
                  : 'text-text-muted hover:text-text'
              }`}
              aria-label="Table View"
            >
              <TableIcon className="w-4 h-4" />
              <span className="hidden md:inline">Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('plan')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-btn rounded-button cursor-pointer transition-colors ${
                viewMode === 'plan'
                  ? 'bg-surface text-text shadow-sm'
                  : 'text-text-muted hover:text-text'
              }`}
              aria-label="Cadastral Plan View"
            >
              <MapIcon className="w-4 h-4" />
              <span className="hidden md:inline">Plan View</span>
            </button>
          </div>

          <Button variant="secondary" size="md" onClick={() => setShowFilters((prev) => !prev)}>
            <Filter className="w-4 h-4 mr-1 text-text-muted" />
            <span className="hidden sm:inline">Filters</span>
          </Button>

          {canCreate && (
            <Button variant="primary" size="md" onClick={handleCreateProperty}>
              <Plus className="w-4 h-4 mr-1" />
              Add Property
            </Button>
          )}
        </div>
      </div>

      {/* TIER 2: KPI METRIC SUMMARY CARDS */}
      <PropertyKpiCards kpis={kpis} />

      {/* TIER 3: MAIN DATA WORKSPACE */}
      <div className="card-workspace">
        {showFilters && (
          <PropertyListFilters
            search={search}
            onSearchChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            statusFilter={statusFilter}
            onStatusChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
            typeFilter={typeFilter}
            onTypeChange={(val) => {
              setTypeFilter(val);
              setPage(1);
            }}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={handleClearFilters}
          />
        )}

        <div className="p-0">
          <PropertyListContent
            isLoading={isLoading}
            isError={isError}
            properties={properties}
            hasActiveFilters={hasActiveFilters}
            viewMode={viewMode}
            canCreate={Boolean(canCreate)}
            selectedPropertyId={selectedProperty?.id}
            onRetry={() => refetch()}
            onClearFilters={handleClearFilters}
            onCreateProperty={handleCreateProperty}
            onSelectProperty={handleSelectProperty}
            onEditProperty={handleEditProperty}
            onOverrideStatus={handleOverrideStatus}
          />
        </div>

        {total > limit && (
          <div className="p-3 border-t border-border bg-surface flex items-center justify-between text-small text-text-muted">
            <span>
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} units
            </span>
            <div className="flex items-center gap-2">
              <IconButton
                variant="secondary"
                size="sm"
                icon={<ChevronLeft className="w-4 h-4" />}
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
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
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next page"
              />
            </div>
          </div>
        )}
      </div>

      {/* Quick Slide-Over Property Drawer */}
      <PropertyDrawer
        property={selectedProperty}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onEdit={handleEditProperty}
        onOverrideStatus={handleOverrideStatus}
        onHold={(prop) => void releaseHold(prop.id)}
        onReleaseHold={(prop) => void releaseHold(prop.id)}
        onBlock={(prop) => void unblockProperty(prop.id)}
        onUnblock={(prop) => void unblockProperty(prop.id)}
        onViewDetails={(prop) => navigate(`/properties/${prop.id}`)}
      />

      {/* Create / Edit Property Modal */}
      <PropertyFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        property={editingProperty}
      />

      {/* Audited Status Override Modal */}
      <PropertyStatusOverrideModal
        isOpen={isOverrideModalOpen}
        onClose={() => setIsOverrideModalOpen(false)}
        property={overrideTargetProperty}
      />
    </div>
  );
}
