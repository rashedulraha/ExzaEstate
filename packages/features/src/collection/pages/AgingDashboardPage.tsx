import { formatMoney } from '@exzaestate/shared';
import { DataTable, type ColumnDef, Input } from '@exzaestate/ui';
import { ShieldCheck, AlertCircle, Calendar } from 'lucide-react';
import { useAgingDashboard } from '../hooks/useAgingDashboard.js';
import { AgingStrip } from '../components/aging/AgingStrip.js';
import type { CustomerAgingRow } from '../schemas/collection.schema.js';

export function AgingDashboardPage() {
  const {
    asOfDate,
    setAsOfDate,
    buckets,
    customerRows,
    totalReceivablePaisa,
    totalReceivableFormatted,
    isReconciled,
    isLoading,
  } = useAgingDashboard();

  const columns: ColumnDef<CustomerAgingRow>[] = [
    {
      key: 'customerName',
      header: 'Customer',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-text">{row.customerName}</span>
          <span className="text-caption text-text-muted">{row.customerId}</span>
        </div>
      ),
    },
    {
      key: 'currentPaisa',
      header: 'Current (Not Due)',
      align: 'right',
      isMoney: true,
      render: (row) => (
        <span className="text-text tabular-nums">{formatMoney(row.currentPaisa || '0')}</span>
      ),
    },
    {
      key: 'days1to7Paisa',
      header: '1–7 Days',
      align: 'right',
      isMoney: true,
      render: (row) => (
        <span className="text-text tabular-nums">{formatMoney(row.days1to7Paisa || '0')}</span>
      ),
    },
    {
      key: 'days8to30Paisa',
      header: '8–30 Days',
      align: 'right',
      isMoney: true,
      render: (row) => (
        <span className="text-text tabular-nums">{formatMoney(row.days8to30Paisa || '0')}</span>
      ),
    },
    {
      key: 'days31to60Paisa',
      header: '31–60 Days',
      align: 'right',
      isMoney: true,
      render: (row) => (
        <span className="text-text tabular-nums">{formatMoney(row.days31to60Paisa || '0')}</span>
      ),
    },
    {
      key: 'days61to90Paisa',
      header: '61–90 Days',
      align: 'right',
      isMoney: true,
      render: (row) => (
        <span className="text-text tabular-nums">{formatMoney(row.days61to90Paisa || '0')}</span>
      ),
    },
    {
      key: 'days90PlusPaisa',
      header: '90+ Days',
      align: 'right',
      isMoney: true,
      render: (row) => (
        <span className="text-danger font-semibold tabular-nums">
          {formatMoney(row.days90PlusPaisa || '0')}
        </span>
      ),
    },
    {
      key: 'totalPaisa',
      header: 'Total Receivable',
      align: 'right',
      isMoney: true,
      render: (row) => (
        <span className="font-bold text-text tabular-nums">
          {row.formattedTotal || formatMoney(row.totalPaisa || '0')}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6" data-testid="aging-dashboard-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 font-bold text-text">Receivables Aging Dashboard</h1>
          <p className="text-small text-text-muted mt-1">
            Aging analysis across 1–7, 8–30, 31–60, 61–90, and 90+ day buckets per design.md §7.2.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 p-1.5 rounded-card border border-border bg-surface text-small">
            <Calendar className="w-4 h-4 text-text-muted ml-1" />
            <span className="text-text-muted">As Of:</span>
            <Input
              id="asOfDateInput"
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="py-1 px-2 text-small border-0 bg-transparent"
            />
          </div>

          {isReconciled ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-caption font-medium text-success bg-success/12 border border-success/20">
              <ShieldCheck className="w-4 h-4" />
              <span>AR Reconciled</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-caption font-medium text-warning bg-warning/12 border border-warning/20">
              <AlertCircle className="w-4 h-4" />
              <span>AR Sync Pending</span>
            </div>
          )}
        </div>
      </div>

      {/* Signature Aging Strip with 5 Tints and KPI Breakdown */}
      <div className="p-6 rounded-card border border-border bg-surface space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-h3 font-bold text-text">Aging Distribution Strip</h3>
            <p className="text-caption text-text-muted">
              5 sequential primary tints direct-labelled with overdue amounts and installment
              counts.
            </p>
          </div>
          <div className="text-right">
            <span className="text-caption text-text-muted block">Total Outstanding AR</span>
            <span className="text-h2 font-extrabold text-text tabular-nums">
              {totalReceivableFormatted || formatMoney(totalReceivablePaisa)}
            </span>
          </div>
        </div>

        <AgingStrip buckets={buckets} totalReceivablePaisa={totalReceivablePaisa} />
      </div>

      {/* Customer Breakdown Table */}
      <div className="space-y-3">
        <h3 className="text-h3 font-bold text-text">Customer Receivables Aging Ledger</h3>
        <DataTable
          columns={columns}
          data={customerRows}
          keyExtractor={(row) => row.customerId}
          isLoading={isLoading}
          totalsRow={
            <div className="flex items-center justify-between px-4 py-3 font-bold text-text border-t-2 border-b border-border bg-surface-sunken/40">
              <span>Total Across All Buckets:</span>
              <span className="text-h4 tabular-nums">
                {totalReceivableFormatted || formatMoney(totalReceivablePaisa)}
              </span>
            </div>
          }
          emptyState={
            <div className="py-12 text-center text-text-muted">
              No outstanding receivables recorded as of this date.
            </div>
          }
        />
      </div>
    </div>
  );
}
