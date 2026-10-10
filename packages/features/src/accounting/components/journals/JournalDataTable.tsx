import { formatMoney, formatDate } from '@exzaestate/shared';
import { DataTable, type ColumnDef, Button } from '@exzaestate/ui';
import { Eye } from 'lucide-react';
import type { JournalItem, JournalStatusEnum } from '../../schemas/accounting.schema.js';

export interface JournalDataTableProps {
  journals: JournalItem[];
  isLoading?: boolean;
  onViewJournal: (journal: JournalItem) => void;
}

function getJournalStatusBadge(status: JournalStatusEnum) {
  const styles: Record<JournalStatusEnum, { label: string; cls: string }> = {
    POSTED: { label: 'Posted', cls: 'bg-success/12 text-success border-success/20' },
    DRAFT: { label: 'Draft', cls: 'bg-surface-sunken text-text-muted border-border' },
    REVIEW: { label: 'Review', cls: 'bg-warning/12 text-warning border-warning/20' },
    REVERSED: { label: 'Reversed', cls: 'bg-special/12 text-special border-special/20' },
    LOCKED: { label: 'Locked', cls: 'bg-primary/12 text-primary border-primary/20' },
  };

  const current = styles[status] || styles.DRAFT;
  return (
    <span
      data-testid="journal-status-badge"
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-caption font-semibold border ${current.cls}`}
    >
      {current.label}
    </span>
  );
}

export function JournalDataTable({
  journals,
  isLoading = false,
  onViewJournal,
}: JournalDataTableProps) {
  const columns: ColumnDef<JournalItem>[] = [
    {
      key: 'journalNumber',
      header: 'Voucher #',
      render: (row) => (
        <span className="font-mono font-bold text-text hover:underline cursor-pointer">
          {row.journalNumber}
        </span>
      ),
    },
    {
      key: 'postingDate',
      header: 'Posting Date',
      render: (row) => (
        <span className="text-text tabular-nums">{formatDate(row.postingDate)}</span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-caption font-medium bg-surface-sunken border border-border text-text">
          {row.type}
        </span>
      ),
    },
    {
      key: 'narration',
      header: 'Voucher Narration',
      render: (row) => (
        <div className="flex flex-col max-w-md">
          <span className="font-medium text-text truncate">{row.narration}</span>
          {row.reference && (
            <span className="text-caption text-text-muted font-mono">Ref: {row.reference}</span>
          )}
        </div>
      ),
    },
    {
      key: 'totalDebitPaisa',
      header: 'Total Debit (Dr)',
      align: 'right',
      isMoney: true,
      render: (row) => (
        <span className="font-bold text-text tabular-nums">{formatMoney(row.totalDebitPaisa)}</span>
      ),
    },
    {
      key: 'totalCreditPaisa',
      header: 'Total Credit (Cr)',
      align: 'right',
      isMoney: true,
      render: (row) => (
        <span className="font-bold text-text tabular-nums">
          {formatMoney(row.totalCreditPaisa)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (row) => getJournalStatusBadge(row.status),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewJournal(row)}
          data-testid={`view-journal-${row.journalNumber}`}
        >
          <Eye className="w-4 h-4 mr-1" />
          View
        </Button>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={journals}
      keyExtractor={(row) => row.id}
      isLoading={isLoading}
      embedded
      className="border-none shadow-none"
      emptyState={
        <div className="py-12 text-center text-text-muted">
          No journal entries found matching current criteria.
        </div>
      }
    />
  );
}
