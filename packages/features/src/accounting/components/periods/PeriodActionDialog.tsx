import { useState, type FormEvent } from 'react';
import { Dialog, FormField, Input, Button } from '@exzaestate/ui';
import { Lock, AlertTriangle } from 'lucide-react';
import type { FiscalPeriodItem } from '../../schemas/accounting.schema.js';

export interface PeriodActionDialogProps {
  isOpen: boolean;
  period: FiscalPeriodItem | null;
  action: 'CLOSE' | 'REOPEN' | 'LOCK';
  onClose: () => void;
  onSubmit: (periodId: string, text: string, password?: string) => Promise<unknown>;
  isSubmitting?: boolean;
}

function PeriodBanner({ isReopen }: { isReopen: boolean }) {
  if (isReopen) {
    return (
      <div className="p-3.5 rounded-card border flex items-start gap-3 bg-warning/10 border-warning/30 text-warning">
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="text-body text-text">
          <span className="font-semibold block">Reopening Closed Fiscal Period</span>
          <p className="text-caption text-text-muted mt-0.5">
            Reopening enables retroactive entries into this timeframe and requires audit
            justification.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3.5 rounded-card border flex items-start gap-3 bg-surface-sunken border-border">
      <Lock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
      <div className="text-body text-text">
        <span className="font-semibold block">Closing Period Prevents Postings</span>
        <p className="text-caption text-text-muted mt-0.5">
          Closing locks transactions from being back-dated into this timeframe without formal
          reopening.
        </p>
      </div>
    </div>
  );
}

export function PeriodActionDialog({
  isOpen,
  period,
  action,
  onClose,
  onSubmit,
  isSubmitting = false,
}: PeriodActionDialogProps) {
  const [reason, setReason] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!period) return null;

  const isReopen = action === 'REOPEN';

  const validate = (): boolean => {
    if (!isReopen) return true;
    const newErrors: Record<string, string> = {};
    if (reason.trim().length < 10) {
      newErrors.reason = 'Business justification must be at least 10 characters';
    }
    if (!password) {
      newErrors.password = 'Step-up password confirmation is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    await onSubmit(period.id, reason.trim(), password);
    setReason('');
    setPassword('');
    onClose();
  };

  const title = isReopen
    ? `Reopen Fiscal Period: ${period.name}`
    : `Close Fiscal Period: ${period.name}`;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={`Period range: ${period.startDate} to ${period.endDate}`}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant={isReopen ? 'destructive' : 'primary'}
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={isSubmitting}
            data-testid="confirm-period-action-btn"
          >
            {isReopen ? 'Confirm Reopen' : 'Close Period'}
          </Button>
        </div>
      }
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-4 text-text"
        data-testid="period-action-form"
      >
        <PeriodBanner isReopen={isReopen} />

        <FormField
          id="periodReason"
          label={isReopen ? 'Reopen Justification (Required)' : 'Closing Remarks (Optional)'}
          required={isReopen}
          error={errors.reason}
        >
          <Input
            id="periodReason"
            placeholder={
              isReopen
                ? 'State the reason for retroactive reopening (minimum 10 characters)'
                : 'Optional period closing memo'
            }
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isSubmitting}
          />
        </FormField>

        {isReopen && (
          <FormField
            id="stepUpPassword"
            label="Step-up Password Confirmation"
            required
            error={errors.password}
          >
            <Input
              id="stepUpPassword"
              type="password"
              placeholder="Confirm your operational password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
            />
          </FormField>
        )}
      </form>
    </Dialog>
  );
}
