import { type ReactElement, useState, useEffect } from 'react';
import { Dialog, Button, FormField, Input } from '@exzaestate/ui';
import type { ApprovalItem } from '../schemas/approval.schema.js';

interface ApprovalDecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  approval: ApprovalItem | null;
  decision: 'APPROVE' | 'REJECT' | 'OVERRIDE';
  onConfirm: (reason: string) => Promise<void>;
  isLoading: boolean;
  currentUserId?: string;
}

function getDecisionTitle(decision: 'APPROVE' | 'REJECT' | 'OVERRIDE'): string {
  if (decision === 'APPROVE') return 'Approve Request';
  if (decision === 'REJECT') return 'Reject Request';
  return 'Executive Override';
}

function getDecisionButtonVariant(
  decision: 'APPROVE' | 'REJECT' | 'OVERRIDE',
): 'primary' | 'destructive' {
  if (decision === 'REJECT') return 'destructive';
  return 'primary';
}

function getDecisionPlaceholder(decision: 'APPROVE' | 'REJECT' | 'OVERRIDE'): string {
  if (decision === 'REJECT') return 'Explain why this request is rejected...';
  if (decision === 'OVERRIDE') return 'State management reason for override...';
  return 'Optional approval notes or comments...';
}

function validateDecision(
  decision: 'APPROVE' | 'REJECT' | 'OVERRIDE',
  isSelf: boolean,
  reason: string,
): string | null {
  if (decision === 'APPROVE' && isSelf) {
    return 'Self-approval not allowed: You cannot approve your own request.';
  }
  const isReasonMandatory = decision === 'REJECT' || decision === 'OVERRIDE';
  if (isReasonMandatory && reason.trim().length < 5) {
    return 'A justification of at least 5 characters is required.';
  }
  return null;
}

interface DecisionFormProps {
  approval: ApprovalItem;
  decision: 'APPROVE' | 'REJECT' | 'OVERRIDE';
  isSelf: boolean;
  isReasonMandatory: boolean;
  reason: string;
  setReason: (val: string) => void;
  error: string | null;
  setError: (val: string | null) => void;
  onSubmit: (e: React.FormEvent) => void;
}

function DecisionForm({
  approval,
  decision,
  isSelf,
  isReasonMandatory,
  reason,
  setReason,
  error,
  setError,
  onSubmit,
}: DecisionFormProps): ReactElement {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {decision === 'APPROVE' && isSelf && (
        <div className="p-3 rounded-card bg-danger/12 border border-danger/20 text-danger text-small">
          <strong>Self-Approval Not Allowed:</strong> You cannot approve a request you initiated
          yourself. Another authorized manager must approve it.
        </div>
      )}

      <div className="p-3 bg-surface-sunken rounded-card border border-border text-small space-y-1">
        <div className="flex justify-between">
          <span className="text-text-muted">Item Type:</span>
          <span className="font-medium text-text">{approval.entityType}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Approval Step:</span>
          <span className="font-medium text-text">
            Step {approval.currentTier} of {approval.maxTier}
          </span>
        </div>
        {approval.percentage !== undefined && approval.percentage !== null && (
          <div className="flex justify-between">
            <span className="text-text-muted">Discount Requested:</span>
            <span className="font-semibold text-accent">{approval.percentage}%</span>
          </div>
        )}
      </div>

      <FormField
        id="decision-reason"
        label={
          isReasonMandatory
            ? 'Reason / Explanation (Required)'
            : 'Approval Notes / Comments (Optional)'
        }
        required={isReasonMandatory}
        error={error ?? undefined}
      >
        <Input
          id="decision-reason"
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            if (error) setError(null);
          }}
          placeholder={getDecisionPlaceholder(decision)}
        />
      </FormField>
    </form>
  );
}

export function ApprovalDecisionModal({
  isOpen,
  onClose,
  approval,
  decision,
  onConfirm,
  isLoading,
  currentUserId,
}: ApprovalDecisionModalProps): ReactElement {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError(null);
    }
  }, [isOpen]);

  if (!approval) return <></>;

  const isSelf = Boolean(currentUserId && approval.requesterId === currentUserId);
  const isReasonMandatory = decision === 'REJECT' || decision === 'OVERRIDE';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateDecision(decision, isSelf, reason);
    if (validationError) {
      setError(validationError);
      return;
    }
    await onConfirm(reason.trim());
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={getDecisionTitle(decision)}
      description={`Record your decision for "${approval.title}". This action is permanently audited.`}
      size="md"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant={getDecisionButtonVariant(decision)}
            onClick={handleSubmit}
            isLoading={isLoading}
            disabled={decision === 'APPROVE' && isSelf}
          >
            Confirm {decision}
          </Button>
        </div>
      }
    >
      <DecisionForm
        approval={approval}
        decision={decision}
        isSelf={isSelf}
        isReasonMandatory={isReasonMandatory}
        reason={reason}
        setReason={setReason}
        error={error}
        setError={setError}
        onSubmit={handleSubmit}
      />
    </Dialog>
  );
}
