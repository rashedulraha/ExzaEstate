import { Button, StatusBadge } from '@exzaestate/ui';
import { formatMoney } from '@exzaestate/shared';
import type {
  ReconciliationGateResult,
  CustomerReconciliationDifference,
} from '../schemas/migration.schema.js';

interface MetricsCardsProps {
  openingAr: string;
  legacyDue: string;
  discrepancy: string;
  isReconciled: boolean;
}

function ReconciliationMetricsCards({
  openingAr,
  legacyDue,
  discrepancy,
  isReconciled,
}: MetricsCardsProps) {
  const discrepancyBadgeClass = isReconciled
    ? 'border-success/30 bg-success/10 text-success'
    : 'border-danger/30 bg-danger/10 text-danger';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="p-4 rounded-card border border-border bg-surface-sunken/40">
        <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
          Opening Accounts Receivable
        </span>
        <div className="text-h2 font-mono font-bold text-text mt-1">{openingAr}</div>
      </div>

      <div className="p-4 rounded-card border border-border bg-surface-sunken/40">
        <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
          Σ Legacy Bookings Outstanding
        </span>
        <div className="text-h2 font-mono font-bold text-text mt-1">{legacyDue}</div>
      </div>

      <div className={`p-4 rounded-card border ${discrepancyBadgeClass}`}>
        <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
          Net Reconciliation Discrepancy
        </span>
        <div className="text-h2 font-mono font-bold mt-1">{discrepancy}</div>
      </div>
    </div>
  );
}

function CustomerDifferencesTable({
  differences,
}: {
  differences: CustomerReconciliationDifference[];
}) {
  if (differences.length === 0) return null;

  return (
    <div className="border border-border rounded-card overflow-hidden">
      <div className="p-3 bg-surface-sunken/40 border-b border-border text-label font-semibold text-text">
        Per-Customer Reconciliation Discrepancies
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-body-sm">
          <thead>
            <tr className="border-b border-border bg-surface-sunken/20 text-caption font-semibold text-text-muted uppercase">
              <th className="py-2.5 px-3">Customer</th>
              <th className="py-2.5 px-3 text-right">Opening AR</th>
              <th className="py-2.5 px-3 text-right">Legacy Running Due</th>
              <th className="py-2.5 px-3 text-right">Variance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {differences.map((c) => {
              const opening = formatMoney(BigInt(c.openingArPaisa || '0'));
              const legacy = formatMoney(BigInt(c.legacyOutstandingPaisa || '0'));
              const variance = formatMoney(BigInt(c.differencePaisa || '0'));
              const varianceColor = c.isReconciled ? 'text-success' : 'text-danger';

              return (
                <tr key={c.customerId}>
                  <td className="py-2.5 px-3 font-medium text-text">
                    {c.customerName || c.customerId}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-text">{opening}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-text">{legacy}</td>
                  <td className={`py-2.5 px-3 text-right font-mono font-bold ${varianceColor}`}>
                    {variance}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export interface ReconciliationGateCardProps {
  reconciliation: ReconciliationGateResult | undefined;
  onOpenFinalize: () => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export function ReconciliationGateCard({
  reconciliation,
  onOpenFinalize,
  onRefresh,
  isLoading,
}: ReconciliationGateCardProps) {
  if (!reconciliation) {
    return (
      <div className="rounded-card border border-border bg-surface-elevated p-6 text-center text-text-muted">
        Reconciliation data not available yet. Post opening balance and record bookings first.
      </div>
    );
  }

  const isReconciled = reconciliation.canFinalize;
  const openingAr =
    reconciliation.totalOpeningArFormatted ||
    formatMoney(BigInt(reconciliation.totalOpeningArPaisa || '0'));
  const legacyDue =
    reconciliation.totalLegacyOutstandingFormatted ||
    formatMoney(BigInt(reconciliation.totalLegacyOutstandingPaisa || '0'));
  const discrepancy =
    reconciliation.differenceFormatted ||
    formatMoney(BigInt(reconciliation.differencePaisa || '0'));

  return (
    <div className="rounded-card border border-border bg-surface-elevated p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h3 className="text-h3 font-semibold text-text">Step 4: Reconciliation Gate (AT-29)</h3>
            <StatusBadge value={isReconciled ? 'CONFIRMED' : 'REJECTED'} />
          </div>
          <p className="text-body-sm text-text-muted mt-0.5">
            Total legacy booking receivables must match the opening Accounts Receivable (1200)
            balance with zero difference (৳0.00).
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button variant="secondary" size="sm" onClick={onRefresh} isLoading={isLoading}>
            Recalculate
          </Button>
          <Button variant="primary" onClick={onOpenFinalize} disabled={!isReconciled}>
            Finalize Migration
          </Button>
        </div>
      </div>

      <ReconciliationMetricsCards
        openingAr={openingAr}
        legacyDue={legacyDue}
        discrepancy={discrepancy}
        isReconciled={isReconciled}
      />

      <CustomerDifferencesTable differences={reconciliation.customerDifferences || []} />
    </div>
  );
}
