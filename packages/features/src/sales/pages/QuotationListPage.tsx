import { type ReactElement, useState } from 'react';
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
import { useQuotationList } from '../hooks/useQuotationList.js';
import { useQuotationActions } from '../hooks/useQuotationActions.js';
import { QuotationDataTable } from '../components/quotations/QuotationDataTable.js';
import { QuotationFormModal } from '../components/quotations/QuotationFormModal.js';
import { QuotationPdfPreviewModal } from '../components/quotations/QuotationPdfPreviewModal.js';
import type { QuotationItem, QuotationStatusEnum } from '../schemas/quotation.schema.js';

export function QuotationListPage(): ReactElement {
  const navigate = useNavigate();
  const { quotations, kpis, filters, setFilters, isLoading, isError, error, refetch } =
    useQuotationList();
  const { createQuotation, sendQuotation, isCreating } = useQuotationActions();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [previewQuotation, setPreviewQuotation] = useState<QuotationItem | null>(null);

  const hasActiveFilters = Boolean(filters.search || (filters.status && filters.status !== 'ALL'));

  return (
    <div className="container-page space-y-6">
      {/* Tier 1: Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Breadcrumbs
            items={[
              { label: 'Overview', href: '/dashboard', onClick: () => navigate('/dashboard') },
              { label: 'CRM & Sales', href: '/crm/leads', onClick: () => navigate('/crm/leads') },
              { label: 'Price Quotations' },
            ]}
          />
          <div className="flex items-center gap-3 mt-1.5">
            <h1 className="text-h1 font-semibold text-text">Price Quotations</h1>
            <span className="text-caption font-semibold px-2 py-0.5 rounded-full bg-surface-sunken text-text-2 border border-border">
              {kpis.totalCount} Proposals
            </span>
          </div>
        </div>

        <PermissionGate permission={PERMISSIONS.QUOTATION_CREATE} fallback={null}>
          <Button variant="primary" className="gap-2" onClick={() => setIsFormOpen(true)}>
            <Plus className="w-4 h-4" />
            <span>Create Quotation</span>
          </Button>
        </PermissionGate>
      </div>

      {/* Tier 2: KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card-stat">
          <span className="text-caption font-semibold uppercase tracking-wider text-text-muted block">
            Total Quotations
          </span>
          <span className="text-hero-num font-bold text-text mt-1.5 block">{kpis.totalCount}</span>
        </div>
        <div className="card-stat">
          <span className="text-caption font-semibold uppercase tracking-wider text-text-muted block">
            Pending Approval
          </span>
          <span className="text-hero-num font-bold text-warning mt-1.5 block">
            {kpis.pendingApprovalCount}
          </span>
        </div>
        <div className="card-stat">
          <span className="text-caption font-semibold uppercase tracking-wider text-text-muted block">
            Client Accepted
          </span>
          <span className="text-hero-num font-bold text-success mt-1.5 block">
            {kpis.acceptedCount}
          </span>
        </div>
        <div className="card-stat">
          <span className="text-caption font-semibold uppercase tracking-wider text-text-muted block">
            Converted to Booking
          </span>
          <span className="text-hero-num font-bold text-accent mt-1.5 block">
            {kpis.convertedCount}
          </span>
        </div>
      </div>

      {/* Tier 3: Main Quotations Workspace */}
      <div className="rounded-card border border-border bg-surface shadow-xs">
        <StickyToolbar className="p-2.5 sm:p-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              <Input
                id="quotation-search"
                inputSize="md"
                placeholder="Search quotations by quotation number, customer name, or unit..."
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                className="pl-9 text-small"
              />
            </div>
            <div className="w-44 sm:w-48">
              <Select
                id="quotation-status-filter"
                inputSize="md"
                value={filters.status}
                onChange={(val) =>
                  setFilters((prev) => ({ ...prev, status: val as QuotationStatusEnum | 'ALL' }))
                }
                options={[
                  { value: 'ALL', label: 'All Statuses' },
                  { value: 'DRAFT', label: 'Draft' },
                  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
                  { value: 'APPROVED', label: 'Approved' },
                  { value: 'SENT', label: 'Sent' },
                  { value: 'ACCEPTED', label: 'Accepted' },
                  { value: 'CONVERTED', label: 'Converted' },
                ]}
              />
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() =>
                  setFilters((prev) => ({ ...prev, search: '', status: 'ALL', page: 1 }))
                }
                className="flex items-center gap-1 px-2.5 py-1.5 text-small text-text-muted hover:text-text rounded-button hover:bg-surface-sunken transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </StickyToolbar>

        {(() => {
          if (isLoading) {
            return <LoadingState variant="table" />;
          }
          if (isError) {
            return (
              <ErrorState
                message={error instanceof Error ? error.message : 'Failed to load quotations'}
                onRetry={() => void refetch()}
              />
            );
          }
          if (quotations.length === 0) {
            return (
              <div className="p-6">
                <EmptyState
                  dashedBorder
                  title="No quotations found"
                  description="Create your first commercial quotation to start the sales cycle."
                  actionLabel="Create Quotation"
                  actionVariant="secondary"
                  actionIcon={<Plus className="w-4 h-4" />}
                  onAction={() => setIsFormOpen(true)}
                />
              </div>
            );
          }
          return (
            <QuotationDataTable
              quotations={quotations}
              isLoading={isLoading}
              onPreviewPdf={(q) => setPreviewQuotation(q)}
              onSend={(q) => void sendQuotation(q.id)}
              onConvertToBooking={(q) => {
                setPreviewQuotation(q);
              }}
            />
          );
        })()}
      </div>

      <QuotationFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={async (data) => {
          await createQuotation(data);
        }}
        isLoading={isCreating}
      />

      <QuotationPdfPreviewModal
        isOpen={Boolean(previewQuotation)}
        onClose={() => setPreviewQuotation(null)}
        quotation={previewQuotation}
      />
    </div>
  );
}
