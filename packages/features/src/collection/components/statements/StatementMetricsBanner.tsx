import type { ReactElement } from 'react';
import { formatMoney } from '@exzaestate/shared';
import { ShieldCheck, AlertCircle } from 'lucide-react';

interface ReconciliationSealProps {
  isReconciled: boolean;
  differencePaisa?: string;
}

export function ReconciliationSeal({
  isReconciled,
  differencePaisa,
}: ReconciliationSealProps): ReactElement {
  if (isReconciled) {
    return (
      <div
        data-testid="reconciliation-seal-success"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-caption font-medium text-success bg-success/12 border border-success/20"
      >
        <ShieldCheck className="w-4 h-4" />
        <span>Reconciled with AR Ledger (AT-14)</span>
      </div>
    );
  }
  return (
    <div
      data-testid="reconciliation-seal-error"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-caption font-medium text-danger bg-danger/12 border border-danger/20"
    >
      <AlertCircle className="w-4 h-4" />
      <span>AR Variance: {formatMoney(differencePaisa || '0')}</span>
    </div>
  );
}

interface StatementKpiGridProps {
  openingBalancePaisa?: string;
  totalDebitsPaisa?: string;
  totalCreditsPaisa?: string;
  closingOutstandingPaisa?: string;
  customerAdvancePaisa?: string;
}

export function StatementKpiGrid({
  openingBalancePaisa,
  totalDebitsPaisa,
  totalCreditsPaisa,
  closingOutstandingPaisa,
  customerAdvancePaisa,
}: StatementKpiGridProps): ReactElement {
  return (
    <div className="grid grid-cols-5 gap-3 pt-2">
      <div className="p-3 rounded-card bg-surface-sunken border border-border">
        <span className="text-caption text-text-muted block">Opening Balance</span>
        <span className="text-h4 font-bold text-text tabular-nums">
          {formatMoney(openingBalancePaisa || '0')}
        </span>
      </div>

      <div className="p-3 rounded-card bg-surface-sunken border border-border">
        <span className="text-caption text-text-muted block">Total Debits (Sales)</span>
        <span className="text-h4 font-bold text-text tabular-nums">
          {formatMoney(totalDebitsPaisa || '0')}
        </span>
      </div>

      <div className="p-3 rounded-card bg-surface-sunken border border-border">
        <span className="text-caption text-text-muted block">Total Credits (Paid)</span>
        <span className="text-h4 font-bold text-success tabular-nums">
          {formatMoney(totalCreditsPaisa || '0')}
        </span>
      </div>

      <div className="p-3 rounded-card bg-surface-sunken border border-border">
        <span className="text-caption text-text-muted block">Closing Outstanding</span>
        <span className="text-h4 font-bold text-text tabular-nums">
          {formatMoney(closingOutstandingPaisa || '0')}
        </span>
      </div>

      <div className="p-3 rounded-card bg-surface-sunken border border-border">
        <span className="text-caption text-text-muted block">Customer Advance</span>
        <span className="text-h4 font-bold text-accent-text tabular-nums">
          {formatMoney(customerAdvancePaisa || '0')}
        </span>
      </div>
    </div>
  );
}

interface DateFilterBarProps {
  fromDate: string;
  toDate: string;
  onChange: (from: string, to: string) => void;
}

export function DateFilterBar({ fromDate, toDate, onChange }: DateFilterBarProps): ReactElement {
  return (
    <div className="flex items-center gap-3 pt-2 border-t border-border">
      <span className="text-small font-medium text-text-muted">Date Range:</span>
      <input
        type="date"
        aria-label="From Date"
        value={fromDate}
        onChange={(e) => onChange(e.target.value, toDate)}
        className="px-2.5 py-1 text-small rounded-button border border-border bg-surface text-text"
      />
      <span className="text-small text-text-muted">to</span>
      <input
        type="date"
        aria-label="To Date"
        value={toDate}
        onChange={(e) => onChange(fromDate, e.target.value)}
        className="px-2.5 py-1 text-small rounded-button border border-border bg-surface text-text"
      />
    </div>
  );
}
