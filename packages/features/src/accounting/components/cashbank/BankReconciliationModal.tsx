import { useState, type FormEvent } from 'react';
import { Dialog, FormField, Input, Button } from '@exzaestate/ui';
import { formatMoney } from '@exzaestate/shared';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import type { CashBankAccountItem } from '../../schemas/accounting.schema.js';

export interface BankReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: CashBankAccountItem | null;
  onSubmit: (
    bankAccountId: string,
    endingBalancePaisa: string,
    cutoffDate: string,
  ) => Promise<unknown>;
  isSubmitting?: boolean;
}

export function BankReconciliationModal({
  isOpen,
  onClose,
  account,
  onSubmit,
  isSubmitting = false,
}: BankReconciliationModalProps) {
  const [statementDate, setStatementDate] = useState(new Date().toISOString().slice(0, 10));
  const [statementBalanceTaka, setStatementBalanceTaka] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!account) return null;

  const statementBalancePaisa = (() => {
    const clean = statementBalanceTaka.replace(/\D/g, '');
    return clean ? (BigInt(clean) * 100n).toString() : '0';
  })();

  const glBalancePaisa = account.currentBalancePaisa;
  const diffPaisa = BigInt(statementBalancePaisa) - BigInt(glBalancePaisa);
  const isMatched = diffPaisa === 0n && statementBalanceTaka !== '';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!statementBalanceTaka) {
      newErrors.balance = 'Statement ending balance is required';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    await onSubmit(account.id, statementBalancePaisa, statementDate);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Reconcile: ${account.accountName}`}
      description="Compare statement ending balance against the general ledger book balance"
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={isSubmitting}
            data-testid="start-reconciliation-btn"
          >
            Confirm Reconciliation
          </Button>
        </div>
      }
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-4 text-text"
        data-testid="reconciliation-form"
      >
        {/* Book balance summary */}
        <div className="p-3.5 rounded-card border border-border bg-surface-sunken flex items-center justify-between">
          <span className="text-body font-medium text-text">GL Book Balance:</span>
          <span className="text-h3 font-bold tabular-nums text-text">
            {formatMoney(glBalancePaisa)}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField id="statementDate" label="Statement Cutoff Date" required>
            <Input
              id="statementDate"
              type="date"
              value={statementDate}
              onChange={(e) => setStatementDate(e.target.value)}
              disabled={isSubmitting}
            />
          </FormField>

          <FormField
            id="statementBalanceTaka"
            label="Statement Balance (BDT ৳)"
            required
            error={errors.balance}
          >
            <Input
              id="statementBalanceTaka"
              placeholder="e.g. 5,00,000"
              value={statementBalanceTaka}
              onChange={(e) => setStatementBalanceTaka(e.target.value)}
              disabled={isSubmitting}
            />
          </FormField>
        </div>

        {/* Live Variance Calculation */}
        {statementBalanceTaka && (
          <div
            className={`p-3.5 rounded-card border flex items-center justify-between ${
              isMatched
                ? 'bg-success/10 border-success/30 text-success'
                : 'bg-warning/10 border-warning/30 text-warning'
            }`}
          >
            <div className="flex items-center gap-2">
              {isMatched ? (
                <CheckCircle2 className="w-5 h-5 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 shrink-0" />
              )}
              <span className="font-semibold text-body text-text">
                {isMatched ? 'Statement Matches GL Book Balance' : 'Unreconciled Difference'}
              </span>
            </div>
            <span className="font-bold tabular-nums text-body">
              {formatMoney(diffPaisa.toString())}
            </span>
          </div>
        )}
      </form>
    </Dialog>
  );
}
