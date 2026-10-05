import { formatMoney } from '@exzaestate/shared';
import { DataTable, type ColumnDef, Input } from '@exzaestate/ui';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import type { TrialBalanceRowDto } from '@exzaestate/api-client';

export interface TrialBalanceViewProps {
  rows: TrialBalanceRowDto[];
  totalDebitPaisa: string;
  totalCreditPaisa: string;
  isBalanced: boolean;
  differencePaisa: string;
  asOfDate: string;
  onDateChange: (date: string) => void;
  isLoading?: boolean;
}

function TrialBalanceBanner({
  isBalanced,
  differencePaisa,
}: {
  isBalanced: boolean;
  differencePaisa: string;
}) {
  if (isBalanced) {
    return (
      <div
        data-testid="tb-balance-banner"
        className="flex items-center gap-2.5 px-4 py-2.5 rounded-card border bg-success/10 border-success/30 text-success"
      >
        <CheckCircle2 className="w-5 h-5 shrink-0" />
        <div className="flex flex-col">
          <span className="font-bold text-body">Trial Balance in Equilibrium</span>
          <span className="text-caption text-text-muted">Total Debits === Total Credits</span>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="tb-balance-banner"
      className="flex items-center gap-2.5 px-4 py-2.5 rounded-card border bg-danger/10 border-danger/30 text-danger"
    >
      <AlertTriangle className="w-5 h-5 shrink-0" />
      <div className="flex flex-col">
        <span className="font-bold text-body">Out of Balance</span>
        <span className="text-caption">Discrepancy: {formatMoney(differencePaisa)}</span>
      </div>
    </div>
  );
}

function formatAmount(valPaisa?: string) {
  const val = BigInt(valPaisa || '0');
  if (val === 0n) return <span className="text-text-muted">—</span>;
  return <span className="font-medium text-text tabular-nums">{formatMoney(valPaisa || '0')}</span>;
}

export function TrialBalanceView({
  rows,
  totalDebitPaisa,
  totalCreditPaisa,
  isBalanced,
  differencePaisa,
  asOfDate,
  onDateChange,
  isLoading = false,
}: TrialBalanceViewProps) {
  const columns: ColumnDef<TrialBalanceRowDto>[] = [
    {
      key: 'accountCode',
      header: 'Code',
      width: '100px',
      render: (row) => <span className="font-mono font-semibold text-text">{row.accountCode}</span>,
    },
    {
      key: 'accountName',
      header: 'Account Title',
      render: (row) => <span className="text-body font-medium text-text">{row.accountName}</span>,
    },
    {
      key: 'accountType',
      header: 'Category',
      width: '120px',
      render: (row) => <span className="text-caption text-text-muted">{row.accountType}</span>,
    },
    {
      key: 'closingDebitPaisa',
      header: 'Closing Debit (Dr)',
      align: 'right',
      isMoney: true,
      render: (row) => formatAmount(row.closingDebitPaisa),
    },
    {
      key: 'closingCreditPaisa',
      header: 'Closing Credit (Cr)',
      align: 'right',
      isMoney: true,
      render: (row) => formatAmount(row.closingCreditPaisa),
    },
  ];

  return (
    <div className="space-y-4" data-testid="trial-balance-view">
      <div className="p-4 rounded-card border border-border bg-surface flex flex-wrap items-center justify-between gap-4">
        <div>
          <label className="block text-caption text-text-muted mb-1 font-medium">
            Reporting As-of Date
          </label>
          <Input
            type="date"
            value={asOfDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="w-48"
          />
        </div>

        <TrialBalanceBanner isBalanced={isBalanced} differencePaisa={differencePaisa} />
      </div>

      <DataTable
        columns={columns}
        data={rows}
        keyExtractor={(row) => row.accountId || row.accountCode}
        isLoading={isLoading}
        totalsRow={
          <div className="flex items-center justify-between px-4 py-3 font-extrabold text-text border-t-2 border-b border-border bg-surface-sunken/40">
            <span>Trial Balance Totals:</span>
            <div className="flex items-center gap-8 tabular-nums">
              <span className="text-h4 text-text">Dr: {formatMoney(totalDebitPaisa)}</span>
              <span className="text-h4 text-text">Cr: {formatMoney(totalCreditPaisa)}</span>
            </div>
          </div>
        }
        emptyState={
          <div className="py-12 text-center text-text-muted">
            No trial balance figures recorded for this date.
          </div>
        }
      />
    </div>
  );
}
