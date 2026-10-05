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
} from '@exzaestate/ui';
import { PermissionGate } from '@exzaestate/app-core';
import { PERMISSIONS } from '@exzaestate/shared';
import { Plus, Search, Users, ShieldCheck, Clock, UserX } from 'lucide-react';
import { useCustomerList, type CustomerItem, type CustomerKpis } from '../hooks/useCustomerList.js';
import { useCustomerActions } from '../hooks/useCustomerActions.js';
import { CustomerDataTable } from '../components/CustomerDataTable.js';
import { CustomerFormModal } from '../components/CustomerFormModal.js';

function CustomerKpiStrip({ kpis }: { kpis: CustomerKpis }): ReactElement {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="card-stat flex items-center gap-3">
        <div className="p-2 rounded-button bg-primary/12 text-primary">
          <Users className="w-4 h-4" />
        </div>
        <div>
          <span className="text-caption text-text-muted block">Total Customers</span>
          <span className="text-hero-num font-bold text-text">{kpis.totalCustomers}</span>
        </div>
      </div>
      <div className="card-stat flex items-center gap-3">
        <div className="p-2 rounded-button bg-success/12 text-success">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div>
          <span className="text-caption text-text-muted block">KYC Verified</span>
          <span className="text-hero-num font-bold text-text">{kpis.verifiedKyc}</span>
        </div>
      </div>
      <div className="card-stat flex items-center gap-3">
        <div className="p-2 rounded-button bg-warning/12 text-warning">
          <Clock className="w-4 h-4" />
        </div>
        <div>
          <span className="text-caption text-text-muted block">Pending KYC</span>
          <span className="text-hero-num font-bold text-text">{kpis.pendingKyc}</span>
        </div>
      </div>
      <div className="card-stat flex items-center gap-3">
        <div className="p-2 rounded-button bg-surface-sunken text-text-muted">
          <UserX className="w-4 h-4" />
        </div>
        <div>
          <span className="text-caption text-text-muted block">Unverified</span>
          <span className="text-hero-num font-bold text-text">{kpis.unverified}</span>
        </div>
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
        title="No customers registered"
        description="Register buyers or convert active sales leads from the CRM pipeline."
        actionLabel="Register First Customer"
        onAction={onOpenAddModal}
      />
    );
  }

  return (
    <CustomerDataTable
      customers={customers}
      isLoading={isLoading}
      onSelectCustomer={onSelectCustomer}
    />
  );
}

export function CustomerListPage(): ReactElement {
  const navigate = useNavigate();
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  const { customers, total, kpis, filters, setFilters, isLoading, isError, error, refetch } =
    useCustomerList();

  const { createCustomer, isCreating } = useCustomerActions();

  return (
    <div className="container-page space-y-6">
      {/* Tier 1: Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Breadcrumbs
            items={[{ label: 'Overview', href: '/' }, { label: 'Customer Directory' }]}
          />
          <div className="flex items-center gap-3 mt-1.5">
            <h1 className="text-h1 font-bold text-text">Customer Directory</h1>
            <span className="text-caption font-semibold px-2 py-0.5 rounded-full bg-surface-sunken text-text-2 border border-border">
              {total} Profiles
            </span>
          </div>
        </div>

        <PermissionGate permission={PERMISSIONS.CUSTOMER_CREATE}>
          <Button variant="primary" className="gap-2" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4" />
            <span>Register Customer</span>
          </Button>
        </PermissionGate>
      </div>

      {/* Tier 2: KPI Summary Strip */}
      <CustomerKpiStrip kpis={kpis} />

      {/* Tier 3: Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-surface rounded-card border border-border">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <Input
              id="search-customers"
              value={filters.search ?? ''}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search by code, customer name, or phone..."
              className="pl-9 h-9"
            />
          </div>
          <div className="w-44">
            <Select
              id="filter-kyc-status"
              value={filters.kycStatus ?? ''}
              onChange={(val) => setFilters({ ...filters, kycStatus: val })}
              options={[
                { label: 'All KYC Statuses', value: '' },
                { label: 'VERIFIED', value: 'VERIFIED' },
                { label: 'PENDING', value: 'PENDING' },
                { label: 'UNVERIFIED', value: 'UNVERIFIED' },
              ]}
            />
          </div>
        </div>
      </div>

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
