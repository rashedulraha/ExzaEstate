import { type ReactElement, useState } from 'react';
import { Input, Select, LoadingState, ErrorState, EmptyState } from '@exzaestate/ui';
import { useAgreementList } from '../hooks/useAgreementList.js';
import { useAgreementActions } from '../hooks/useAgreementActions.js';
import { AgreementDataTable } from '../components/agreements/AgreementDataTable.js';
import { AgreementViewerModal } from '../components/agreements/AgreementViewerModal.js';
import type { AgreementItem, AgreementStatusEnum } from '../schemas/agreement.schema.js';

interface RenderTableProps {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  agreements: AgreementItem[];
  onRetry: () => void;
  onSelect: (a: AgreementItem) => void;
}

function renderTableContent({
  isLoading,
  isError,
  error,
  agreements,
  onRetry,
  onSelect,
}: RenderTableProps): ReactElement {
  if (isLoading) {
    return <LoadingState variant="table" />;
  }
  if (isError) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : 'Failed to load agreements'}
        onRetry={onRetry}
      />
    );
  }
  if (agreements.length === 0) {
    return (
      <EmptyState
        title="No agreements found"
        description="Agreements are generated automatically upon booking confirmation."
      />
    );
  }
  return (
    <AgreementDataTable
      agreements={agreements}
      isLoading={isLoading}
      onViewAgreement={onSelect}
      onSignAndLock={onSelect}
    />
  );
}

export function AgreementListPage(): ReactElement {
  const { agreements, kpis, filters, setFilters, isLoading, isError, error, refetch } =
    useAgreementList();
  const { signAndLockAgreement, isSigningAndLocking } = useAgreementActions();

  const [selectedAgreement, setSelectedAgreement] = useState<AgreementItem | null>(null);

  return (
    <div className="container-page">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 font-bold text-text">Legal Agreements</h1>
          <p className="text-small text-text-muted mt-1">
            Contract lifecycle, signing workflows, immutable locking, and versioning
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-stat">
          <div className="text-small font-medium text-text-muted">Total Agreements</div>
          <div className="text-hero-num font-bold text-text mt-1">{kpis.totalCount}</div>
        </div>
        <div className="card-stat">
          <div className="text-small font-medium text-text-muted">Pending Signature</div>
          <div className="text-hero-num font-bold text-warning mt-1">
            {kpis.pendingSignatureCount}
          </div>
        </div>
        <div className="card-stat">
          <div className="text-small font-medium text-text-muted">Signed & Immutable Locked</div>
          <div className="text-hero-num font-bold text-success mt-1">
            {kpis.signedAndLockedCount}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1">
          <Input
            id="agreement-search"
            placeholder="Search agreements by agreement #, title, or allottee..."
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            id="agreement-status-filter"
            value={filters.status}
            onChange={(val) =>
              setFilters((prev) => ({ ...prev, status: val as AgreementStatusEnum | 'ALL' }))
            }
            options={[
              { value: 'ALL', label: 'All Statuses' },
              { value: 'AGREEMENT_PENDING', label: 'Pending Signature' },
              { value: 'AGREEMENT_COMPLETED', label: 'Signed & Locked' },
              { value: 'CANCELLED', label: 'Cancelled' },
            ]}
          />
        </div>
      </div>

      {renderTableContent({
        isLoading,
        isError,
        error,
        agreements,
        onRetry: () => void refetch(),
        onSelect: (a) => setSelectedAgreement(a),
      })}

      <AgreementViewerModal
        isOpen={Boolean(selectedAgreement)}
        onClose={() => setSelectedAgreement(null)}
        agreement={selectedAgreement}
        onSignAndLock={async (id, notes) => {
          await signAndLockAgreement(id, { notes });
        }}
        isLoading={isSigningAndLocking}
      />
    </div>
  );
}
