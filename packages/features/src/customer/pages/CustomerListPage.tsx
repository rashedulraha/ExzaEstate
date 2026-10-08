import { useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router';
import {
  Breadcrumbs,
  Button,
  Input,
  Select,
  LoadingState,
  ErrorState,
  EmptyState,
  StickyToolbar,
} from '@exzaestate/ui';
import { PermissionGate } from '@exzaestate/app-core';
import { PERMISSIONS } from '@exzaestate/shared';
import { Plus, Search, X } from 'lucide-react';
import { useCustomerList, type CustomerItem, type CustomerKpis } from '../hooks/useCustomerList.js';
import { useCustomerActions } from '../hooks/useCustomerActions.js';
import { CustomerDataTable } from '../components/CustomerDataTable.js';
import { CustomerFormModal } from '../components/CustomerFormModal.js';

function CustomerKpiStrip({ kpis }: { kpis: CustomerKpis }): ReactElement {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="card-stat">
        <span className="text-caption font-semibold uppercase tracking-wider text-text-muted block">
          Total Customers
        </span>
        <span className="text-hero-num font-bold text-text mt-1.5 block">
          {kpis.totalCustomers}
        </span>
      </div>
      <div className="card-stat">
        <span className="text-caption font-semibold uppercase tracking-wider text-text-muted block">
          KYC Verified
        </span>
        <span className="text-hero-num font-bold text-success mt-1.5 block">
          {kpis.verifiedKyc}
        </span>
      </div>
      <div className="card-stat">
        <span className="text-caption font-semibold uppercase tracking-wider text-text-muted block">
          Pending KYC
        </span>
        <span className="text-hero-num font-bold text-warning mt-1.5 block">{kpis.pendingKyc}</span>
      </div>
      <div className="card-stat">
        <span className="text-caption font-semibold uppercase tracking-wider text-text-muted block">
          Unverified
        </span>
        <span className="text-hero-num font-bold text-text-muted mt-1.5 block">
          {kpis.unverified}
        </span>
      </div>
    </div>
  );
}

function CustomerListContent({
  isLoading,
  isError,
  error,
  onRetry,
  customers,
  onSelectCustomer,
  onOpenAddModal,
}: {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  customers: CustomerItem[];
  onSelectCustomer: (c: CustomerItem) => void;
  onOpenAddModal: () => void;
}): ReactElement {
  if (isLoading) {
    return <LoadingState variant="table" />;
  }

  if (isError) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : 'Failed to load customers'}
        onRetry={onRetry}
      />
    );
  }

  if (customers.length === 0) {
    return (
      <EmptyState
        dashedBorder
        title="No Customers Registered"
        description="Register property buyers or convert inquiries from your sales leads."
        actionLabel="Register Customer"
        actionVariant="secondary"
        actionIcon={<Plus className="w-4 h-4" />}
        onAction={onOpenAddModal}
      />
    );
  }

  return (
    <div className="bg-surface rounded-card border border-border overflow-hidden">
      <CustomerDataTable
        customers={customers}
        isLoading={isLoading}
        onSelectCustomer={onSelectCustomer}
      />
    </div>
  );
}

export function CustomerListPage(): ReactElement {
  const navigate = useNavigate();
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  const { customers, total, kpis, filters, setFilters, isLoading, isError, error, refetch } =
    useCustomerList();

  const { createCustomer, isCreating } = useCustomerActions();
  const hasActiveFilters = Boolean(filters.search || filters.kycStatus);

  return (
    <div className="container-page space-y-6">
      {/* Tier 1: Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Breadcrumbs
            items={[
              { label: 'Overview', href: '/dashboard', onClick: () => navigate('/dashboard') },
              { label: 'Customer Directory' },
            ]}
          />
          <div className="flex items-center gap-3 mt-1.5">
            <h1 className="text-h1 font-semibold text-text">Customer Directory</h1>
            <span className="text-caption font-semibold px-2 py-0.5 rounded-full bg-surface-sunken text-text-2 border border-border">
              {total} Profiles
            </span>
          </div>
        </div>

        <PermissionGate permission={PERMISSIONS.CUSTOMER_CREATE} fallback={null}>
          <Button variant="primary" className="gap-2" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4" />
            <span>Register Customer</span>
          </Button>
        </PermissionGate>
      </div>

      {/* Tier 2: KPI Summary Strip */}
      <CustomerKpiStrip kpis={kpis} />

      {/* Tier 3: Search and Filters */}
      <StickyToolbar>
        <div className="shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2.5 bg-surface rounded-card border border-border">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              <Input
                id="search-customers"
                inputSize="md"
                value={filters.search ?? ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Search by code, customer name, phone, or NID..."
                className="pl-9 text-small"
              />
            </div>
            <div className="w-40 sm:w-44">
              <Select
                id="filter-kyc-status"
                inputSize="md"
                value={filters.kycStatus ?? ''}
                onChange={(val) => setFilters({ ...filters, kycStatus: val })}
                options={[
                  { label: 'All Verification Statuses', value: '' },
                  { label: 'Verified', value: 'VERIFIED' },
                  { label: 'Pending Verification', value: 'PENDING' },
                  { label: 'Unverified', value: 'UNVERIFIED' },
                ]}
              />
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => setFilters({ ...filters, search: '', kycStatus: '' })}
                className="flex items-center gap-1 px-2.5 py-1.5 text-small text-text-muted hover:text-text rounded-button hover:bg-surface-sunken transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>
      </StickyToolbar>

      {/* Main Content Area */}
      <CustomerListContent
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        customers={customers}
        onSelectCustomer={(c: CustomerItem) => navigate(`/customers/${c.id}`)}
        onOpenAddModal={() => setIsAddModalOpen(true)}
      />

      {/* Modal */}
      <CustomerFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={async (data) => {
          await createCustomer(data);
        }}
        isLoading={isCreating}
      />
    </div>
  );
}
