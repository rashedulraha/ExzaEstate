import { type ReactElement, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Breadcrumbs,
  Input,
  Select,
  LoadingState,
  ErrorState,
  EmptyState,
  StickyToolbar,
} from '@exzaestate/ui';
import { Search, X } from 'lucide-react';
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
  isEmbedded?: boolean;
}

function renderTableContent({
  isLoading,
  isError,
  error,
  agreements,
  onRetry,
  onSelect,
  isEmbedded = false,
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
      <div className="p-6">
        <EmptyState
          dashedBorder
          title="No agreements found"
          description="Agreements are generated automatically upon booking confirmation."
        />
      </div>
    );
  }
  if (isEmbedded) {
    return (
      <AgreementDataTable
        agreements={agreements}
        isLoading={isLoading}
        onViewAgreement={onSelect}
        onSignAndLock={onSelect}
      />
    );
  }
  return (
    <div className="bg-surface rounded-card border border-border overflow-hidden">
      <AgreementDataTable
        agreements={agreements}
        isLoading={isLoading}
        onViewAgreement={onSelect}
        onSignAndLock={onSelect}
      />
    </div>
  );
}

export function AgreementListPage(): ReactElement {
  const navigate = useNavigate();
  const { agreements, kpis, filters, setFilters, isLoading, isError, error, refetch } =
    useAgreementList();
  const { signAndLockAgreement, isSigningAndLocking } = useAgreementActions();

  const [selectedAgreement, setSelectedAgreement] = useState<AgreementItem | null>(null);
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
              { label: 'Legal Agreements' },
            ]}
          />
          <div className="flex items-center gap-3 mt-1.5">
            <h1 className="text-h1 font-semibold text-text">Legal Agreements</h1>
            <span className="text-caption font-semibold px-2 py-0.5 rounded-full bg-surface-sunken text-text-2 border border-border">
              {kpis.totalCount} Documents
            </span>
          </div>
        </div>
      </div>

      {/* Tier 2: KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card-stat">
          <span className="text-caption font-semibold uppercase tracking-wider text-text-muted block">
            Total Agreements
          </span>
          <span className="text-hero-num font-bold text-text mt-1.5 block">{kpis.totalCount}</span>
        </div>
        <div className="card-stat">
          <span className="text-caption font-semibold uppercase tracking-wider text-text-muted block">
            Pending Signature
          </span>
          <span className="text-hero-num font-bold text-warning mt-1.5 block">
            {kpis.pendingSignatureCount}
          </span>
        </div>
        <div className="card-stat">
          <span className="text-caption font-semibold uppercase tracking-wider text-text-muted block">
            Signed & Immutable Locked
          </span>
          <span className="text-hero-num font-bold text-success mt-1.5 block">
            {kpis.signedAndLockedCount}
          </span>
        </div>
      </div>

      {/* Tier 3: Main Agreements Workspace */}
      <div className="rounded-card border border-border bg-surface shadow-xs">
        <StickyToolbar className="p-2.5 sm:p-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              <Input
                id="agreement-search"
                inputSize="md"
                placeholder="Search agreements by agreement #, title, or allottee..."
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                className="pl-9 text-small"
              />
            </div>
            <div className="w-44 sm:w-52">
              <Select
                id="agreement-status-filter"
                inputSize="md"
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

        {renderTableContent({
          isLoading,
          isError,
          error,
          agreements,
          onRetry: () => void refetch(),
          onSelect: (a) => setSelectedAgreement(a),
          isEmbedded: true,
        })}
      </div>

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
