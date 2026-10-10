import { useState, type FormEvent } from 'react';
import { Dialog, FormField, Input, Button } from '@exzaestate/ui';
import { AlertTriangle } from 'lucide-react';
import type { JournalItem, JournalReversalInput } from '../../schemas/accounting.schema.js';

export interface JournalReversalModalProps {
  isOpen: boolean;
  journal: JournalItem | null;
  onClose: () => void;
  onSubmit: (input: JournalReversalInput) => Promise<unknown>;
  isSubmitting?: boolean;
}

export function JournalReversalModal({
  isOpen,
  journal,
  onClose,
  onSubmit,
  isSubmitting = false,
}: JournalReversalModalProps) {
  const [reason, setReason] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!journal) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!reason.trim() || reason.trim().length < 10) {
      newErrors.reason = 'Reversal justification must be at least 10 characters';
    }
    if (!password) {
      newErrors.password = 'Step-up password confirmation is required';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    await onSubmit({
      journalId: journal.id,
      reason: reason.trim(),
      stepUpPassword: password,
    });

    setReason('');
    setPassword('');
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Reverse Posted Journal Voucher"
      description={`Post offsetting mirror journal for voucher ${journal.journalNumber}`}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={isSubmitting}
            data-testid="confirm-journal-reversal-btn"
          >
            Post Reversal Entry
          </Button>
        </div>
      }
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-4 text-text"
        data-testid="journal-reversal-form"
      >
        <div className="p-3.5 rounded-card border border-warning/30 bg-warning/10 text-body flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div className="text-body text-text">
            <span className="font-semibold block">
              Permanent Audit Ledger: Offsetting Reversal Entry
            </span>
            <p className="text-caption text-text-muted mt-0.5">
              Financial records cannot be deleted. This operation creates an exact offsetting
              reversal journal linked to{' '}
              <span className="font-mono font-semibold">{journal.journalNumber}</span>.
            </p>
          </div>
        </div>

        <FormField
          id="reversalReason"
          label="Reversal Justification Reason"
          required
          error={errors.reason}
        >
          <Input
            id="reversalReason"
            placeholder="e.g. Correcting mistaken account allocation / cancelled transaction"
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
        >
          <div className="relative">
            <Input
              id="stepUpPassword"
              type="password"
              placeholder="Confirm your operational password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        </FormField>
      </form>
    </Dialog>
  );
}
