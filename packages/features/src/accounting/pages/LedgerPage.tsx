import { useSearchParams, useNavigate } from 'react-router';
import { Breadcrumbs } from '@exzaestate/ui';
import { useLedgerReport } from '../hooks/useLedgerReport.js';
import { useCoaTree } from '../hooks/useCoaTree.js';
import { GeneralLedgerView } from '../components/ledger/GeneralLedgerView.js';

export function LedgerPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialAccountId = searchParams.get('accountId') || undefined;

  const { filters, setFilters, lines, totals, hasMore, nextPage, isLoading } = useLedgerReport({
    accountId: initialAccountId,
  });

  const { accounts } = useCoaTree();

  return (
    <div className="container-page space-y-6" data-testid="ledger-page">
      {/* Tier 1: Breadcrumbs & Header */}
      <div>
        <Breadcrumbs
          items={[
            { label: 'Overview', href: '/dashboard', onClick: () => navigate('/dashboard') },
            { label: 'Finance & Treasury' },
            { label: 'General Ledger' },
          ]}
        />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-1.5 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-h1 font-bold text-text">General Ledger</h1>
              <span className="text-caption font-mono font-semibold px-2.5 py-0.5 rounded-full bg-surface-sunken text-text-2 border border-border">
                GL-01 · Transactional Book
              </span>
            </div>
            <p className="text-small text-text-muted mt-1">
              Detailed transactional ledger entries, running balances, and account audit logs.
            </p>
          </div>
        </div>
      </div>

      <GeneralLedgerView
        lines={lines}
        totals={totals}
        filters={filters}
        onFilterChange={setFilters}
        accounts={accounts}
        hasMore={hasMore}
        onLoadMore={nextPage}
        isLoading={isLoading}
      />
    </div>
  );
}
