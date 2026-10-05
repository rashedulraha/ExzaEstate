import { formatMoney, formatDate } from '@exzaestate/shared';
import { Button, DataTable, type ColumnDef } from '@exzaestate/ui';
import { Download } from 'lucide-react';
import type {
  StatementLineItem,
  CustomerStatementReport,
  ArReconciliationReport,
} from '../../schemas/collection.schema.js';
import { ReconciliationSeal, StatementKpiGrid, DateFilterBar } from './StatementMetricsBanner.js';

export interface CustomerStatementViewerProps {
  statement: CustomerStatementReport | null;
  reconciliation?: ArReconciliationReport | null;
  isLoading?: boolean;
  fromDate?: string;
  toDate?: string;
  onFilterChange?: (from: string, to: string) => void;
  onExportPdf?: () => void;
}

function getStatementColumns(): ColumnDef<StatementLineItem>[] {
  return [
    {
      key: 'date',
      header: 'Date',
      render: (row) => <span className="text-text tabular-nums">{formatDate(row.date)}</span>,
    },
    {
      key: 'referenceNumber',
      header: 'Reference',
      render: (row) => {
        const fallback = (row as unknown as Record<string, unknown>).reference as
          | string
          | undefined;
        return (
          <span className="font-semibold text-text font-mono text-small">
            {row.referenceNumber || fallback || '—'}
          </span>
        );
      },
    },
    {
      key: 'description',
      header: 'Description / Narration',
      render: (row) => <span className="text-text">{row.description}</span>,
    },
    {
      key: 'debitPaisa',
      header: 'Debit (Charges)',
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
      header: 'Credit (Payments)',
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
}

function mapStatementLines(rawLines?: unknown[]): StatementLineItem[] {
  if (!rawLines || !Array.isArray(rawLines)) return [];
  return rawLines.map((line, idx) => {
    const l = line as Record<string, string | undefined>;
    return {
      id: l.id || `line-${idx}`,
      date: l.date || '',
      referenceNumber: l.reference || '',
      description: l.description || '',
      debitPaisa: l.debitPaisa || '0',
      creditPaisa: l.creditPaisa || '0',
      runningBalancePaisa: l.runningBalancePaisa || '0',
    };
  });
}

interface StatementHeaderProps {
  customerName: string;
  customerPhone?: string | null;
  isReconciled: boolean;
  differencePaisa?: string;
  onExportPdf?: () => void;
}

function StatementHeader({
  customerName,
  customerPhone,
  isReconciled,
  differencePaisa,
  onExportPdf,
}: StatementHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
          Statement of Account
        </span>
        <h2 className="text-h2 font-bold text-text mt-0.5">{customerName}</h2>
        {customerPhone && <p className="text-small text-text-muted">Phone: {customerPhone}</p>}
      </div>

      <div className="flex items-center gap-3">
        <ReconciliationSeal isReconciled={isReconciled} differencePaisa={differencePaisa} />

        {onExportPdf && (
          <Button variant="secondary" size="sm" onClick={onExportPdf} className="gap-1.5">
            <Download className="w-4 h-4" />
            <span>Export PDF</span>
          </Button>
        )}
      </div>
    </div>
  );
}

const STATEMENT_COLUMNS = getStatementColumns();

export function CustomerStatementViewer({
  statement,
  reconciliation,
  isLoading,
  fromDate = '',
  toDate = '',
  onFilterChange,
  onExportPdf,
}: CustomerStatementViewerProps) {
  if (!statement) {
    return (
      <div className="p-8 text-center text-text-muted rounded-card border border-border bg-surface">
        Please select a customer to view their running balance statement.
      </div>
    );
  }

  const tableData = mapStatementLines(statement.lines);
  const isReconciled = reconciliation?.isReconciled ?? true;
  const closingBalance = statement.closingOutstandingPaisa
    ? statement.closingOutstandingPaisa
    : '0';

  return (
    <div className="space-y-6" data-testid="customer-statement-viewer">
      {/* Top Header & Metrics Banner */}
      <div className="p-6 rounded-card border border-border bg-surface space-y-4">
        <StatementHeader
          customerName={statement.customerName}
          customerPhone={statement.customerPhone}
          isReconciled={isReconciled}
          differencePaisa={reconciliation?.differencePaisa}
          onExportPdf={onExportPdf}
        />

        {onFilterChange && (
          <DateFilterBar fromDate={fromDate} toDate={toDate} onChange={onFilterChange} />
        )}

        <StatementKpiGrid
          openingBalancePaisa={statement.openingBalancePaisa}
          totalDebitsPaisa={statement.totalDebitsPaisa}
          totalCreditsPaisa={statement.totalCreditsPaisa}
          closingOutstandingPaisa={statement.closingOutstandingPaisa}
          customerAdvancePaisa={statement.customerAdvancePaisa}
        />
      </div>

      {/* Ledger DataTable */}
      <DataTable
        columns={STATEMENT_COLUMNS}
        data={tableData}
        keyExtractor={(row) => row.id || row.referenceNumber || row.date || 'row'}
        isLoading={isLoading}
        totalsRow={
          <div className="flex items-center justify-between px-4 py-2.5 font-bold text-text border-t-2 border-b border-border bg-surface-sunken/40">
            <span>Closing Outstanding Balance:</span>
            <span className="text-h4 tabular-nums">{formatMoney(closingBalance)}</span>
          </div>
        }
        emptyState={
          <div className="py-12 text-center text-text-muted">
            No transactions found for the selected period.
          </div>
        }
      />
    </div>
  );
}
