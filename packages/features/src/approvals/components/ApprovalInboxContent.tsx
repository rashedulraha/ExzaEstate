import type { ReactElement } from 'react';
import { LoadingState, ErrorState, EmptyState } from '@exzaestate/ui';
import { ApprovalDataTable } from './ApprovalDataTable.js';
import type { ApprovalItem } from '../schemas/approval.schema.js';

interface ApprovalInboxContentProps {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  approvals: ApprovalItem[];
  refetch: () => void;
  onSelectApproval: (item: ApprovalItem) => void;
  onOpenDecision: (item: ApprovalItem, decision: 'APPROVE' | 'REJECT' | 'OVERRIDE') => void;
  currentUserId?: string;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
}

export function ApprovalInboxContent({
  isLoading,
  isError,
  error,
  approvals,
  refetch,
  onSelectApproval,
  onOpenDecision,
  currentUserId,
  hasActiveFilters = false,
  onClearFilters,
}: ApprovalInboxContentProps): ReactElement {
  if (isLoading) {
    return <LoadingState variant="table" />;
  }

  if (isError) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : 'Failed to load approvals'}
        onRetry={refetch}
      />
    );
  }

  if (approvals.length === 0) {
    if (hasActiveFilters) {
      return (
        <div className="p-6">
          <EmptyState
            title="No Matching Approvals"
            description="No approval requests match your active search and filter criteria."
            dashedBorder
            actionLabel="Clear Filters"
            onAction={onClearFilters}
          />
        </div>
      );
    }
    return (
      <div className="p-6">
        <EmptyState
          title="Inbox is clear"
          description="There are currently no approval requests requiring review."
          dashedBorder
        />
      </div>
    );
  }

  return (
    <ApprovalDataTable
      approvals={approvals}
      isLoading={false}
      onSelectApproval={onSelectApproval}
      onOpenDecision={onOpenDecision}
      currentUserId={currentUserId}
    />
  );
}
