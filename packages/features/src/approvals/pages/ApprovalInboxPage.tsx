import { type ReactElement, useState } from 'react';
import { useAuth } from '@exzaestate/app-core';
import { useApprovalList } from '../hooks/useApprovalList.js';
import { useApprovalActions } from '../hooks/useApprovalActions.js';
import { ApprovalKpiStrip } from '../components/ApprovalKpiStrip.js';
import { ApprovalInboxFilters } from '../components/ApprovalInboxFilters.js';
import { ApprovalInboxContent } from '../components/ApprovalInboxContent.js';
import { ApprovalDecisionModal } from '../components/ApprovalDecisionModal.js';
import { ApprovalDetailDrawer } from '../components/ApprovalDetailDrawer.js';
import type { ApprovalItem } from '../schemas/approval.schema.js';

interface DecisionModalState {
  isOpen: boolean;
  approval: ApprovalItem | null;
  decision: 'APPROVE' | 'REJECT' | 'OVERRIDE';
}

export function ApprovalInboxPage(): ReactElement {
  const { user } = useAuth();
  const { approvals, kpis, filters, setFilters, isLoading, isError, error, refetch } =
    useApprovalList();
  const { approve, reject, override, isApproving, isRejecting, isOverriding } =
    useApprovalActions();

  const [selectedApproval, setSelectedApproval] = useState<ApprovalItem | null>(null);
  const [decisionModal, setDecisionModal] = useState<DecisionModalState>({
    isOpen: false,
    approval: null,
    decision: 'APPROVE',
  });

  const handleOpenDecision = (item: ApprovalItem, decision: 'APPROVE' | 'REJECT' | 'OVERRIDE') => {
    setDecisionModal({ isOpen: true, approval: item, decision });
  };

  const handleConfirmDecision = async (reason: string) => {
    if (!decisionModal.approval) return;
    const id = decisionModal.approval.id;
    if (decisionModal.decision === 'APPROVE') {
      await approve(id, reason);
    } else if (decisionModal.decision === 'REJECT') {
      await reject(id, reason);
    } else {
      await override(id, reason);
    }
  };

  return (
    <div className="container-page">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 font-bold text-text">Approval Inbox</h1>
          <p className="text-small text-text-muted mt-1">
            Maker-checker verification and multi-tier authorization center
          </p>
        </div>
      </div>

      <ApprovalKpiStrip kpis={kpis} />

      <ApprovalInboxFilters filters={filters} onChange={setFilters} />

      <ApprovalInboxContent
        isLoading={isLoading}
        isError={isError}
        error={error}
        approvals={approvals}
        refetch={() => void refetch()}
        onSelectApproval={(item) => setSelectedApproval(item)}
        onOpenDecision={handleOpenDecision}
        currentUserId={user?.id}
      />

      <ApprovalDecisionModal
        isOpen={decisionModal.isOpen}
        onClose={() => setDecisionModal((prev) => ({ ...prev, isOpen: false }))}
        approval={decisionModal.approval}
        decision={decisionModal.decision}
        onConfirm={handleConfirmDecision}
        isLoading={isApproving || isRejecting || isOverriding}
        currentUserId={user?.id}
      />

      <ApprovalDetailDrawer
        isOpen={Boolean(selectedApproval)}
        onClose={() => setSelectedApproval(null)}
        approval={selectedApproval}
        onOpenDecision={handleOpenDecision}
        currentUserId={user?.id}
      />
    </div>
  );
}
