import { useState } from 'react';
import { formatMoney } from '@exzaestate/shared';
import { Dialog, Button, FormField, Input } from '@exzaestate/ui';
import { AlertTriangle, Lock } from 'lucide-react';
import type { PaymentItem, PaymentReversalInput } from '../../schemas/collection.schema.js';

export interface PaymentReversalModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: PaymentItem | null;
  onConfirmReversal: (data: PaymentReversalInput) => Promise<void>;
}

export function PaymentReversalModal({
  isOpen,
  onClose,
  payment,
  onConfirmReversal,
}: PaymentReversalModalProps) {
  const [reason, setReason] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!payment) return null;

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};
    if (!reason.trim() || reason.trim().length < 10) {
      nextErrors.reason = 'Reversal reason must be at least 10 characters';
    }
    if (!password) {
      nextErrors.password = 'Step-up password confirmation is required';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleReverse = async () => {
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      await onConfirmReversal({
        paymentId: payment.id,
        reason: reason.trim(),
        stepUpPassword: password,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Reverse Posted Payment"
      description={`Receipt #${payment.receiptNumber} · ${formatMoney(payment.amountPaisa)}`}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleReverse}
            isLoading={isSubmitting}
            disabled={isSubmitting}
            data-testid="confirm-reverse-button"
          >
            Reverse Payment
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Warning Banner */}
        <div className="flex items-start gap-3 p-3.5 rounded-card bg-danger/10 border border-danger/20 text-danger">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-small space-y-1">
            <p className="font-semibold">Irreversible Financial Action (RULE-IMMUTABLE)</p>
            <p className="text-danger/90">
              Posted payments and receipts cannot be edited or deleted. Proceeding will generate an
              immutable reversal journal, mark the receipt as VOID, and restore customer dues.
            </p>
          </div>
        </div>

        <div className="p-3 rounded-card bg-surface-sunken border border-border text-small space-y-1">
          <div className="flex justify-between">
            <span className="text-text-muted">Customer:</span>
            <span className="font-medium text-text">{payment.customerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Payment Method:</span>
            <span className="font-medium text-text">{payment.paymentMethod}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Amount:</span>
            <span className="font-semibold text-text tabular-nums">
              {formatMoney(payment.amountPaisa)}
            </span>
          </div>
        </div>

        <FormField
          id="reversalReason"
          label="Reversal Reason"
          required
          error={errors.reason}
          helperText="Explain why this transaction is being reversed (minimum 10 characters)"
        >
          <Input
            id="reversalReason"
            placeholder="e.g. Incorrect bank account credited by customer cheque"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isSubmitting}
          />
        </FormField>

        <FormField
          id="stepUpPassword"
          label="Step-up Password Verification"
          required
          error={errors.password}
          helperText="Enter your user password to confirm privileged financial reversal"
        >
          <Input
            id="stepUpPassword"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSubmitting}
            suffixIcon={<Lock className="w-4 h-4 text-text-muted pointer-events-none" />}
          />
        </FormField>
      </div>
    </Dialog>
  );
}
