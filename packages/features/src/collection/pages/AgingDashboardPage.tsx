import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { formatMoney } from '@exzaestate/shared';
import {
  DataTable,
  type ColumnDef,
  Input,
  Breadcrumbs,
  EmptyState,
  StickyToolbar,
} from '@exzaestate/ui';
import { Search, Users } from 'lucide-react';
import { useAgingDashboard } from '../hooks/useAgingDashboard.js';
import { AgingStrip } from '../components/aging/AgingStrip.js';
import type { CustomerAgingRow } from '../schemas/collection.schema.js';

export function AgingDashboardPage() {
  const navigate = useNavigate();
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

  const [searchQuery, setSearchQuery] = useState('');

  const filteredCustomerRows = useMemo(() => {
    if (!searchQuery.trim()) return customerRows;
    const query = searchQuery.toLowerCase().trim();
    return customerRows.filter(
      (r) =>
        r.customerName.toLowerCase().includes(query) || r.customerId.toLowerCase().includes(query),
    );
  }, [customerRows, searchQuery]);

  const columns: ColumnDef<CustomerAgingRow>[] = [
    {
      key: 'customerName',
      header: 'Customer',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-text">{row.customerName}</span>
          <span className="text-caption text-text-muted font-mono">{row.customerId}</span>
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
        <span className="text-danger font-bold tabular-nums">
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
    <div className="container-page space-y-6" data-testid="aging-dashboard-page">
      {/* Tier 1: Page Shell & Clean Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Breadcrumbs
            items={[
              { label: 'Overview', href: '/dashboard', onClick: () => navigate('/dashboard') },
              { label: 'Finance & Accounts' },
              { label: 'AR Aging Analysis' },
            ]}
          />
          <div className="flex items-center gap-3 mt-1.5">
            <h1 className="text-h1 font-bold text-text">AR Aging Analysis</h1>
            {isReconciled ? (
              <span className="px-2.5 py-0.5 rounded-full text-caption font-semibold text-success bg-success/12 border border-success/20">
                AR Reconciled
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-caption font-semibold text-warning bg-warning/12 border border-warning/20">
                AR Sync Pending
              </span>
            )}
          </div>
          <p className="text-small text-text-muted mt-1">
            Delinquency aging distribution across 1–7, 8–30, 31–60, 61–90, and 90+ day buckets per
            double-entry schedule.
          </p>
        </div>

        {/* Date Filter Control */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-button border border-border bg-surface shadow-xs">
          <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
            As Of Date:
          </span>
          <Input
            id="asOfDateInput"
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            className="py-1 px-2 text-small border border-border rounded-button bg-surface-sunken"
          />
        </div>
      </div>

      {/* Tier 2: Aging Distribution Strip Card */}
      <div className="p-5 rounded-card border border-border bg-surface shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-h2 font-bold text-text">Aging Distribution Overview</h2>
            <p className="text-caption text-text-muted mt-0.5">
              5 sequential delinquency buckets with installment count and share distribution.
            </p>
          </div>
          <div className="sm:text-right">
            <span className="text-caption font-semibold uppercase tracking-wider text-text-muted block">
              Total Outstanding AR
            </span>
            <span className="text-h2 font-extrabold text-text tabular-nums">
              {totalReceivableFormatted || formatMoney(totalReceivablePaisa)}
            </span>
          </div>
        </div>

        <AgingStrip buckets={buckets} totalReceivablePaisa={totalReceivablePaisa} />
      </div>

      {/* Tier 3: Sticky Customer Receivables Ledger Toolbar */}
      <StickyToolbar>
        <div className="p-4 rounded-card border border-border bg-surface shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-h3 font-bold text-text">Customer Receivables Ledger</h3>
            <span className="text-caption font-semibold px-2 py-0.5 rounded-full bg-surface-sunken text-text-2 border border-border">
              {filteredCustomerRows.length}{' '}
              {filteredCustomerRows.length === 1 ? 'Customer' : 'Customers'}
            </span>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              id="customerSearch"
              placeholder="Search by customer name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </StickyToolbar>

      {/* Tier 4: Data Table Card */}
      <div className="rounded-card border border-border bg-surface shadow-xs">
        {/* Data Table */}
        <DataTable
          columns={columns}
          data={filteredCustomerRows}
          keyExtractor={(row) => row.customerId}
          isLoading={isLoading}
          className="border-none shadow-none"
          totalsRow={
            <div className="flex items-center justify-between px-4 py-3 font-bold text-text border-t-2 border-b border-border bg-surface-sunken">
              <span>Total Across All Buckets:</span>
              <span className="text-h3 tabular-nums font-extrabold">
                {totalReceivableFormatted || formatMoney(totalReceivablePaisa)}
              </span>
            </div>
          }
          emptyState={
            <EmptyState
              icon={<Users className="w-6 h-6" />}
              title="No Receivables Recorded"
              description={
                searchQuery
                  ? 'No customers match your search criteria.'
                  : 'No outstanding client receivables recorded as of this date.'
              }
              dashedBorder
            />
          }
        />
      </div>
    </div>
  );
}
