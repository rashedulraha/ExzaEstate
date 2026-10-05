import { type ReactElement, useState } from 'react';
import { Button, Input, Select, LoadingState, ErrorState, EmptyState } from '@exzaestate/ui';
import { PermissionGate } from '@exzaestate/app-core';
import { PERMISSIONS } from '@exzaestate/shared';
import { useQuotationList } from '../hooks/useQuotationList.js';
import { useQuotationActions } from '../hooks/useQuotationActions.js';
import { QuotationDataTable } from '../components/quotations/QuotationDataTable.js';
import { QuotationFormModal } from '../components/quotations/QuotationFormModal.js';
import { QuotationPdfPreviewModal } from '../components/quotations/QuotationPdfPreviewModal.js';
import type { QuotationItem, QuotationStatusEnum } from '../schemas/quotation.schema.js';

export function QuotationListPage(): ReactElement {
  const { quotations, kpis, filters, setFilters, isLoading, isError, error, refetch } =
    useQuotationList();
  const { createQuotation, sendQuotation, isCreating } = useQuotationActions();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [previewQuotation, setPreviewQuotation] = useState<QuotationItem | null>(null);

  return (
    <div className="container-page">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 font-bold text-text">Quotations</h1>
          <p className="text-small text-text-muted mt-1">
            Commercial proposal management and automated discount approvals
          </p>
        </div>
        <PermissionGate permission={PERMISSIONS.QUOTATION_CREATE}>
          <Button variant="primary" onClick={() => setIsFormOpen(true)}>
            + Create Quotation
          </Button>
        </PermissionGate>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-stat">
          <div className="text-small font-medium text-text-muted">Total Quotations</div>
          <div className="text-hero-num font-bold text-text mt-1">{kpis.totalCount}</div>
        </div>
        <div className="card-stat">
          <div className="text-small font-medium text-text-muted">Pending Approval</div>
          <div className="text-hero-num font-bold text-warning mt-1">
            {kpis.pendingApprovalCount}
          </div>
        </div>
        <div className="card-stat">
          <div className="text-small font-medium text-text-muted">Client Accepted</div>
          <div className="text-hero-num font-bold text-success mt-1">{kpis.acceptedCount}</div>
        </div>
        <div className="card-stat">
          <div className="text-small font-medium text-text-muted">Converted to Booking</div>
          <div className="text-hero-num font-bold text-primary mt-1">{kpis.convertedCount}</div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1">
          <Input
            id="quotation-search"
            placeholder="Search quotations by quote #, client name, or unit..."
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            id="quotation-status-filter"
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
      </div>

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
            <EmptyState
              title="No quotations found"
              description="Create your first commercial quotation to start the sales cycle."
            />
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
