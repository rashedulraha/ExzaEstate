import { formatMoney, formatDate } from '@exzaestate/shared';
import { DataTable, type ColumnDef, Button, Input, NoPermissionState } from '@exzaestate/ui';
import { usePermission } from '@exzaestate/app-core';
import { PERMISSIONS } from '@exzaestate/shared';
import { ChevronRight } from 'lucide-react';
import type { LedgerEntryItem, AccountTreeItem } from '../../schemas/accounting.schema.js';
import type { LedgerFilters } from '../../hooks/useLedgerReport.js';

export interface GeneralLedgerViewProps {
  lines: LedgerEntryItem[];
  totals: {
    openingBalancePaisa: string;
    totalDebitsPaisa: string;
    totalCreditsPaisa: string;
    closingBalancePaisa: string;
  };
  filters: LedgerFilters;
  onFilterChange: (filters: LedgerFilters) => void;
  accounts: AccountTreeItem[];
  hasMore?: boolean;
  onLoadMore?: () => void;
  isLoading?: boolean;
}

export function GeneralLedgerView({
  lines,
  totals,
  filters,
  onFilterChange,
  accounts,
  hasMore = false,
  onLoadMore,
  isLoading = false,
}: GeneralLedgerViewProps) {
  const { hasPermission: canViewLedger } = usePermission(PERMISSIONS.LEDGER_VIEW);

  if (!canViewLedger) {
    return <NoPermissionState permission={PERMISSIONS.LEDGER_VIEW} />;
  }

  const columns: ColumnDef<LedgerEntryItem>[] = [
    {
      key: 'postingDate',
      header: 'Posting Date',
      render: (row) => (
        <span className="text-text tabular-nums">{formatDate(row.postingDate)}</span>
      ),
    },
    {
      key: 'journalNumber',
      header: 'Voucher #',
      render: (row) => (
        <span className="font-mono font-semibold text-text">{row.journalNumber}</span>
      ),
    },
    {
      key: 'narration',
      header: 'Particulars / Description',
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-body text-text">{row.narration}</span>
          {row.partyName && (
            <span className="text-caption text-text-muted">Party: {row.partyName}</span>
          )}
        </div>
      ),
    },
    {
      key: 'debitPaisa',
      header: 'Debit (Dr)',
      align: 'right',
      isMoney: true,
      render: (row) => {
        const val = BigInt(row.debitPaisa || '0');
        if (val === 0n) return <span className="text-text-muted">—</span>;
        return (
          <span className="font-medium text-text tabular-nums">{formatMoney(row.debitPaisa)}</span>
        );
      },
    },
    {
      key: 'creditPaisa',
      header: 'Credit (Cr)',
      align: 'right',
      isMoney: true,
      render: (row) => {
        const val = BigInt(row.creditPaisa || '0');
        if (val === 0n) return <span className="text-text-muted">—</span>;
        return (
          <span className="font-medium text-success tabular-nums">
            {formatMoney(row.creditPaisa)}
          </span>
        );
      },
    },
    {
      key: 'runningBalancePaisa',
      header: 'Running Balance',
      align: 'right',
      isMoney: true,
      render: (row) => {
        const val = BigInt(row.runningBalancePaisa || '0');
        const isNeg = val < 0n;
        return (
          <span className={`font-bold tabular-nums ${isNeg ? 'text-accent-text' : 'text-text'}`}>
            {formatMoney(row.runningBalancePaisa)}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-4" data-testid="general-ledger-view">
      {/* Filters Toolbar */}
      <div className="p-4 rounded-card border border-border bg-surface flex flex-wrap items-center gap-3">
        <div className="w-64">
          <label className="block text-caption text-text-muted mb-1 font-medium">Account</label>
          <select
            data-testid="ledger-account-filter"
            value={filters.accountId || ''}
            onChange={(e) => onFilterChange({ ...filters, accountId: e.target.value })}
            className="w-full px-3 py-1.5 rounded-button border border-border-input bg-surface text-text text-body"
          >
            <option value="">All Accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} — {a.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-caption text-text-muted mb-1 font-medium">From Date</label>
          <Input
            type="date"
            value={filters.startDate || ''}
            onChange={(e) => onFilterChange({ ...filters, startDate: e.target.value })}
            className="w-40"
          />
        </div>

        <div>
          <label className="block text-caption text-text-muted mb-1 font-medium">To Date</label>
          <Input
            type="date"
            value={filters.endDate || ''}
            onChange={(e) => onFilterChange({ ...filters, endDate: e.target.value })}
            className="w-40"
          />
        </div>
      </div>

      {/* Ledger Table */}
      <DataTable
        columns={columns}
        data={lines}
        keyExtractor={(row) => row.id}
        isLoading={isLoading}
        totalsRow={
          <div className="flex flex-col border-t-2 border-b border-border bg-surface-sunken/40">
            <div className="flex items-center justify-between px-4 py-2 text-caption text-text-muted">
              <span>Opening Balance:</span>
              <span className="font-semibold tabular-nums text-text">
                {formatMoney(totals.openingBalancePaisa)}
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5 font-bold text-text border-t border-border">
              <span>Period Movements & Closing Balance:</span>
              <div className="flex items-center gap-6 tabular-nums">
                <span className="text-text">Dr: {formatMoney(totals.totalDebitsPaisa)}</span>
                <span className="text-success">Cr: {formatMoney(totals.totalCreditsPaisa)}</span>
                <span className="text-h4 text-text pl-4 border-l border-border font-extrabold">
                  Closing: {formatMoney(totals.closingBalancePaisa)}
                </span>
              </div>
            </div>
          </div>
        }
        emptyState={
          <div className="py-12 text-center text-text-muted">
            No ledger entries found for the selected account and timeframe.
          </div>
        }
      />

      {/* Keyset Pagination */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="secondary"
            onClick={onLoadMore}
            isLoading={isLoading}
            data-testid="load-more-ledger-btn"
          >
            Load Next Page <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
