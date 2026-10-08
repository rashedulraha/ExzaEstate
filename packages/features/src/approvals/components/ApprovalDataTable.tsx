import type { ReactElement } from 'react';
import { DataTable, StatusBadge, Button, type ColumnDef, EmptyState } from '@exzaestate/ui';
import { formatMoney } from '@exzaestate/shared';
import { CheckCheck } from 'lucide-react';
import type { ApprovalItem } from '../schemas/approval.schema.js';

interface ApprovalDataTableProps {
  approvals: ApprovalItem[];
  isLoading: boolean;
  onSelectApproval: (item: ApprovalItem) => void;
  onOpenDecision: (item: ApprovalItem, decision: 'APPROVE' | 'REJECT' | 'OVERRIDE') => void;
  currentUserId?: string;
  className?: string;
}

function formatEntityId(entityId?: string | null): string {
  if (!entityId) return '—';
  return entityId.slice(0, 8);
}

export function ApprovalDataTable({
  approvals,
  isLoading,
  onSelectApproval,
  onOpenDecision,
  currentUserId,
  className,
}: ApprovalDataTableProps): ReactElement {
  const columns: ColumnDef<ApprovalItem>[] = [
    {
      key: 'title',
      header: 'Request Title',
      render: (row) => (
        <div>
          <button
            type="button"
            className="font-medium text-text hover:text-primary transition-colors text-left"
            onClick={() => onSelectApproval(row)}
          >
            {row.title}
          </button>
          <div className="text-caption text-text-muted mt-0.5 font-mono">
            {row.entityType} #{formatEntityId(row.entityId)}
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
          return (
            <span className="font-semibold text-text tabular-nums">
              {formatMoney(row.amountPaisa)}
            </span>
          );
        }
        if (row.percentage !== undefined && row.percentage !== null) {
          return <span className="font-semibold text-primary">{row.percentage}%</span>;
        }
        return <span className="text-text-muted">—</span>;
      },
    },
    {
      key: 'tier',
      header: 'Approval Tier',
      render: (row) => (
        <div className="text-small font-medium text-text tabular-nums">
          Tier {row.currentTier} of {row.maxTier}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (row) => <StatusBadge domain="approval" value={row.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => {
        if (row.status !== 'PENDING') {
          return <span className="text-caption text-text-muted italic">Resolved</span>;
        }
        const isSelf = currentUserId && row.requesterId === currentUserId;
        return (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              variant="primary"
              size="sm"
              disabled={Boolean(isSelf)}
              title={isSelf ? 'Cannot approve own request' : undefined}
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
      className={className || 'border-none shadow-none'}
      emptyState={
        <EmptyState
          icon={<CheckCheck className="w-6 h-6" />}
          title="No Pending Approvals"
          description="There are no pending approval requests matching your criteria."
          dashedBorder
        />
      }
    />
  );
}
