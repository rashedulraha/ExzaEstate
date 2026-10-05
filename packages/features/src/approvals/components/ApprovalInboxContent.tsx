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
    return (
      <EmptyState
        title="Inbox is clear"
        description="There are no pending approval requests matching your criteria."
      />
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
