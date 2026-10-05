import type { ReactElement } from 'react';
import { Drawer, StatusBadge, Button } from '@exzaestate/ui';
import { formatMoney, formatDate } from '@exzaestate/shared';
import type { ApprovalItem } from '../schemas/approval.schema.js';

interface ApprovalDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  approval: ApprovalItem | null;
  onOpenDecision: (item: ApprovalItem, decision: 'APPROVE' | 'REJECT' | 'OVERRIDE') => void;
  currentUserId?: string;
}

export function ApprovalDetailDrawer({
  isOpen,
  onClose,
  approval,
  onOpenDecision,
  currentUserId,
}: ApprovalDetailDrawerProps): ReactElement {
  if (!approval) return <></>;

  const isSelf = currentUserId && approval.requesterId === currentUserId;
  const isPending = approval.status === 'PENDING';

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={approval.title}
      subtitle={`Category: ${approval.type} · Entity: ${approval.entityType}`}
      size="md"
      footer={
        isPending ? (
          <div className="flex justify-between items-center w-full">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                onClose();
                onOpenDecision(approval, 'OVERRIDE');
              }}
            >
              Executive Override
            </Button>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenDecision(approval, 'REJECT');
                }}
              >
                Reject
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={Boolean(isSelf)}
                title={isSelf ? 'Self-approval blocked (AT-24)' : undefined}
                onClick={() => {
                  onClose();
                  onOpenDecision(approval, 'APPROVE');
                }}
              >
                Approve
              </Button>
            </div>
          </div>
        ) : undefined
      }
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-surface-sunken rounded-card border border-border">
          <div>
            <div className="text-caption text-text-muted">Current Status</div>
            <div className="mt-1">
              <StatusBadge domain="approval" value={approval.status} />
            </div>
          </div>
          <div className="text-right">
            <div className="text-caption text-text-muted">Workflow Tier</div>
            <div className="text-small font-semibold text-text mt-1">
              Tier {approval.currentTier} of {approval.maxTier}
            </div>
          </div>
        </div>

        {approval.amountPaisa && (
          <div className="card-stat">
            <div className="text-caption text-text-muted">Financial Impact</div>
            <div className="text-h2 font-bold text-text mt-1">
              {formatMoney(approval.amountPaisa)}
            </div>
          </div>
        )}

        {approval.percentage !== undefined && approval.percentage !== null && (
          <div className="card-stat">
            <div className="text-caption text-text-muted">Requested Percentage</div>
            <div className="text-h2 font-bold text-accent mt-1">{approval.percentage}%</div>
          </div>
        )}

        <div className="space-y-3">
          <h4 className="text-h5 font-semibold text-text-muted uppercase tracking-wider">
            Audit Attributes
          </h4>
          <div className="divide-y divide-border-subtle text-small">
            <div className="py-2.5 flex justify-between">
              <span className="text-text-2">Entity UUID</span>
              <span className="font-mono text-caption text-text">{approval.entityId}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-text-2">Submitted On</span>
              <span className="text-text">{formatDate(approval.createdAt, 'Asia/Dhaka')}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-text-2">Last Modified</span>
              <span className="text-text">{formatDate(approval.updatedAt, 'Asia/Dhaka')}</span>
            </div>
          </div>
        </div>

        {approval.reason && (
          <div className="p-4 rounded-card bg-surface-sunken border border-border space-y-1">
            <div className="text-h5 font-semibold text-text-muted uppercase tracking-wider">
              Reason / Justification
            </div>
            <div className="text-small text-text-2">{approval.reason}</div>
          </div>
        )}
      </div>
    </Drawer>
  );
}
