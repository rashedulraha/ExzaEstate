import type { ReactElement } from 'react';
import { DataTable, StatusBadge, Button, type ColumnDef } from '@exzaestate/ui';
import { formatMoney } from '@exzaestate/shared';
import type { ApprovalItem } from '../schemas/approval.schema.js';

interface ApprovalDataTableProps {
  approvals: ApprovalItem[];
  isLoading: boolean;
  onSelectApproval: (item: ApprovalItem) => void;
  onOpenDecision: (item: ApprovalItem, decision: 'APPROVE' | 'REJECT' | 'OVERRIDE') => void;
  currentUserId?: string;
}

export function ApprovalDataTable({
  approvals,
  isLoading,
  onSelectApproval,
  onOpenDecision,
  currentUserId,
}: ApprovalDataTableProps): ReactElement {
  const columns: ColumnDef<ApprovalItem>[] = [
    {
      key: 'title',
      header: 'Request / Subject',
      render: (row) => (
        <div>
          <button
            type="button"
            className="font-medium text-primary hover:underline text-left"
            onClick={() => onSelectApproval(row)}
          >
            {row.title}
          </button>
          <div className="text-caption text-text-muted mt-0.5">
            {row.entityType} #{row.entityId.slice(0, 8)}
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Category',
      render: (row) => (
        <span className="inline-flex items-center px-2.5 py-0.5 text-caption font-semibold rounded-full bg-surface-sunken text-text-2 border border-border">
          {row.type}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount / Scale',
      render: (row) => {
        if (row.amountPaisa) {
          return <span className="font-semibold text-text">{formatMoney(row.amountPaisa)}</span>;
        }
        if (row.percentage !== undefined && row.percentage !== null) {
          return <span className="font-semibold text-accent">{row.percentage}%</span>;
        }
        return <span className="text-text-muted">—</span>;
      },
    },
    {
      key: 'tier',
      header: 'Tier Progress',
      render: (row) => (
        <div className="text-small font-medium text-text">
          Tier {row.currentTier} of {row.maxTier}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge domain="approval" value={row.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => {
        if (row.status !== 'PENDING') {
          return <span className="text-caption text-text-muted italic">Resolved</span>;
        }
        const isSelf = currentUserId && row.requesterId === currentUserId;
        return (
          <div className="flex items-center gap-1.5">
            <Button
              variant="primary"
              size="sm"
              disabled={Boolean(isSelf)}
              title={isSelf ? 'Maker cannot approve own request (AT-24)' : undefined}
              onClick={() => onOpenDecision(row, 'APPROVE')}
            >
              Approve
            </Button>
            <Button variant="destructive" size="sm" onClick={() => onOpenDecision(row, 'REJECT')}>
              Reject
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <DataTable<ApprovalItem>
      data={approvals}
      columns={columns}
      isLoading={isLoading}
      keyExtractor={(item) => item.id}
    />
  );
}
