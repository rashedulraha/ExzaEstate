import { type ReactElement, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@exzaestate/app-core';
import { Breadcrumbs } from '@exzaestate/ui';
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
  const navigate = useNavigate();
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

  const hasActiveFilters = Boolean(
    filters.search || filters.status !== 'ALL' || filters.type !== 'ALL',
  );

  const handleClearFilters = () => {
    setFilters((prev) => ({
      ...prev,
      search: '',
      status: 'ALL',
      type: 'ALL',
      page: 1,
    }));
  };

  return (
    <div className="container-page space-y-6" data-testid="approval-inbox-page">
      {/* Tier 1: Page Shell & Clean Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Breadcrumbs
            items={[
              { label: 'Overview', href: '/dashboard', onClick: () => navigate('/dashboard') },
              { label: 'Finance & Accounts' },
              { label: 'Pending Approvals' },
            ]}
          />
          <div className="flex items-center gap-3 mt-1.5">
            <h1 className="text-h1 font-bold text-text">Pending Approvals</h1>
            <span className="text-caption font-semibold px-2.5 py-0.5 rounded-full bg-warning/12 text-warning border border-warning/20">
              {kpis.pendingCount} Awaiting Review
            </span>
            <span className="text-caption font-semibold px-2.5 py-0.5 rounded-full bg-surface-sunken text-text-2 border border-border">
              {approvals.length} {approvals.length === 1 ? 'Total' : 'Total'}
            </span>
          </div>
          <p className="text-small text-text-muted mt-1">
            Review and approve discount requests, office expenses, and special authorizations.
          </p>
        </div>
      </div>

      {/* Tier 2: Responsive KPI Cards Strip */}
      <ApprovalKpiStrip kpis={kpis} />

      {/* Tier 3: Main Approvals Workspace (Merged Filter Bar & Data Table) */}
      <div className="rounded-card border border-border bg-surface shadow-xs">
        <ApprovalInboxFilters
          filters={filters}
          onChange={setFilters}
          totalCount={approvals.length}
        />
        <ApprovalInboxContent
          isLoading={isLoading}
          isError={isError}
          error={error}
          approvals={approvals}
          refetch={() => void refetch()}
          onSelectApproval={(item) => setSelectedApproval(item)}
          onOpenDecision={handleOpenDecision}
          currentUserId={user?.id}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={handleClearFilters}
        />
      </div>

      {/* Modals & Drawers */}
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
