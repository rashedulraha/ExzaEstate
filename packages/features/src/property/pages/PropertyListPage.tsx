import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  Table as TableIcon,
  Map as MapIcon,
  Plus,
  Filter,
  RefreshCw,
  Download,
} from 'lucide-react';
import { Breadcrumbs, Button, IconButton, StickyToolbar } from '@exzaestate/ui';
import { usePermission } from '@exzaestate/app-core';
import { PERMISSIONS } from '@exzaestate/shared';
import { usePropertyList, type PropertyItem } from '../hooks/usePropertyList.js';
import { usePropertyActions } from '../hooks/usePropertyActions.js';
import { PropertyDrawer } from '../components/PropertyDrawer.js';
import { PropertyFormModal } from '../components/PropertyFormModal.js';
import { PropertyStatusOverrideModal } from '../components/PropertyStatusOverrideModal.js';
import type { CanonicalPropertyStatusEnum, PropertyTypeEnum } from '../schemas/property.schema.js';
import { PropertyKpiCards } from './PropertyKpiCards.js';
import {
  PropertyListFilters,
  PropertyListContent,
  PaginationBar,
  exportPropertiesToCsv,
} from './PropertyListComponents.js';

export function PropertyListPage() {
  const navigate = useNavigate();
  const { hasPermission: canCreate } = usePermission(PERMISSIONS.PROPERTY_CREATE);

  const [viewMode, setViewMode] = useState<'table' | 'plan'>('table');
  const [showFilters, setShowFilters] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const limit = 25;

  const queryParams = useMemo(() => {
    return {
      search: search.trim() || undefined,
      status: (statusFilter || undefined) as CanonicalPropertyStatusEnum | undefined,
      type: (typeFilter || undefined) as PropertyTypeEnum | undefined,
      page,
      limit,
    };
  }, [search, statusFilter, typeFilter, page]);

  const { properties, total, totalPages, kpis, isLoading, isError, refetch } = usePropertyList({
    params: queryParams,
  });

  const { releaseHold, unblockProperty } = usePropertyActions();

  const [selectedProperty, setSelectedProperty] = useState<PropertyItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<PropertyItem | null>(null);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideTargetProperty, setOverrideTargetProperty] = useState<PropertyItem | null>(null);

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setTypeFilter('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(search || statusFilter || typeFilter);
  const isInitialEmpty = !isLoading && !isError && total === 0 && !hasActiveFilters;

  const mainContent = (
    <PropertyListContent
      isLoading={isLoading}
      isError={isError}
      properties={properties}
      hasActiveFilters={hasActiveFilters}
      viewMode={viewMode}
      canCreate={canCreate}
      selectedPropertyId={selectedProperty?.id}
      onRetry={() => void refetch()}
      onClearFilters={handleClearFilters}
      onCreateProperty={() => {
        setEditingProperty(null);
        setIsFormModalOpen(true);
      }}
      onSelectProperty={(prop) => {
        setSelectedProperty(prop);
        setIsDrawerOpen(true);
      }}
      onEditProperty={(prop) => {
        setEditingProperty(prop);
        setIsFormModalOpen(true);
      }}
      onOverrideStatus={(prop) => {
        setOverrideTargetProperty(prop);
        setIsOverrideModalOpen(true);
      }}
    />
  );

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
            <span className="text-caption font-semibold px-2.5 py-0.5 rounded-full bg-surface-sunken text-text-2 border border-border">
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
              className={`flex flex-row items-center gap-1.5 px-3 py-1.5 text-btn rounded-button cursor-pointer transition-colors ${
                viewMode === 'table'
                  ? 'bg-surface text-text shadow-xs'
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
              className={`flex flex-row items-center gap-1.5 px-3 py-1.5 text-btn rounded-button cursor-pointer transition-colors ${
                viewMode === 'plan'
                  ? 'bg-surface text-text shadow-xs'
                  : 'text-text-muted hover:text-text'
              }`}
              aria-label="Cadastral Plan View"
            >
              <MapIcon className="w-4 h-4" />
              <span className="hidden md:inline">Plan View</span>
            </button>
          </div>

          <IconButton
            variant="secondary"
            size="md"
            icon={
              <RefreshCw className={`w-4 h-4 text-text-muted ${isLoading ? 'animate-spin' : ''}`} />
            }
            aria-label="Refresh property list"
            onClick={() => void refetch()}
          />

          <Button
            variant="secondary"
            size="md"
            leftIcon={<Download className="w-4 h-4 text-text-muted" />}
            onClick={() => exportPropertiesToCsv(properties)}
            disabled={total === 0}
          >
            <span className="hidden sm:inline">Export</span>
          </Button>

          <Button
            variant="secondary"
            size="md"
            leftIcon={<Filter className="w-4 h-4 text-text-muted" />}
            onClick={() => setShowFilters((prev) => !prev)}
            disabled={isInitialEmpty}
          >
            <span className="hidden sm:inline">Filters</span>
          </Button>

          {canCreate && (
            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setEditingProperty(null);
                setIsFormModalOpen(true);
              }}
            >
              Add Property
            </Button>
          )}
        </div>
      </div>

      {/* TIER 2: KPI METRIC SUMMARY CARDS */}
      <PropertyKpiCards kpis={kpis} />

      {/* TIER 3: MAIN DATA WORKSPACE (SEARCH TOOLBAR + TABLE / PLAN VIEW + PAGINATION) */}
      {isInitialEmpty ? (
        mainContent
      ) : (
        <div className="rounded-card border border-border bg-surface shadow-xs">
          {showFilters && (
            <StickyToolbar>
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
            </StickyToolbar>
          )}

          {mainContent}

          <PaginationBar
            page={page}
            limit={limit}
            total={total}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* Quick Slide-Over Property Drawer */}
      <PropertyDrawer
        property={selectedProperty}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onEdit={(prop) => {
          setEditingProperty(prop);
          setIsFormModalOpen(true);
        }}
        onOverrideStatus={(prop) => {
          setOverrideTargetProperty(prop);
          setIsOverrideModalOpen(true);
        }}
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
