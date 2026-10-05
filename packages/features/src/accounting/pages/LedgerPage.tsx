import { useSearchParams } from 'react-router';
import { useLedgerReport } from '../hooks/useLedgerReport.js';
import { useCoaTree } from '../hooks/useCoaTree.js';
import { GeneralLedgerView } from '../components/ledger/GeneralLedgerView.js';

export function LedgerPage() {
  const [searchParams] = useSearchParams();
  const initialAccountId = searchParams.get('accountId') || undefined;

  const { filters, setFilters, lines, totals, hasMore, nextPage, isLoading } = useLedgerReport({
    accountId: initialAccountId,
  });

  const { accounts } = useCoaTree();

  return (
    <div className="space-y-6" data-testid="ledger-page">
      <div>
        <h1 className="text-h1 font-bold text-text">General Ledger</h1>
        <p className="text-small text-text-muted mt-1">
          Detailed transactional ledger entries, running balances, and account audit logs.
        </p>
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
