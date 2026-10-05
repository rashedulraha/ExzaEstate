import { useState } from 'react';
import { Award } from 'lucide-react';
import { formatMoney } from '@exzaestate/shared';
import { Dialog, Button, FormField, Input, Select } from '@exzaestate/ui';
import type { CommissionPayableItem, PayCommissionInput } from '../../schemas/operations.schema.js';

export interface CommissionPayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: PayCommissionInput) => Promise<void>;
  commission: CommissionPayableItem | null;
  bankAccounts?: Array<{ id: string; name: string; accountNumber: string; code?: string }>;
}

export function CommissionPayModal({
  isOpen,
  onClose,
  onSubmit,
  commission,
  bankAccounts = [],
}: CommissionPayModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'CHEQUE'>(
    'BANK_TRANSFER',
  );
  const [bankAccountId, setBankAccountId] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !commission) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const selectedAccount = bankAccounts.find((b) => b.id === bankAccountId);
      await onSubmit({
        paymentMethod,
        bankAccountId: paymentMethod !== 'CASH' ? bankAccountId : undefined,
        bankAccountCode: selectedAccount?.code,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to disburse commission');
    } finally {
      setIsSubmitting(false);
    }
  };

  const paymentMethodOptions = [
    { label: 'Bank Transfer / EFT / BEFTN', value: 'BANK_TRANSFER' },
    { label: 'Cheque', value: 'CHEQUE' },
    { label: 'Cash', value: 'CASH' },
  ];

  const bankAccountOptions = [
    { label: 'Select bank account...', value: '' },
    ...bankAccounts.map((acc) => ({
      label: `${acc.name} (${acc.accountNumber})`,
      value: acc.id,
    })),
  ];

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Disburse Commission"
      description="Broker Incentive Payout"
      size="md"
    >
      {error && (
        <div className="mb-4 rounded-card border border-danger/30 bg-danger/10 p-3 text-caption text-danger">
          {error}
        </div>
      )}

      <div className="mb-4 rounded-card border border-border bg-surface-sunken/40 p-3.5 space-y-2">
        <div className="flex items-center gap-2 text-small">
          <Award className="h-4 w-4 text-accent" />
          <span className="text-text-muted">Payable to:</span>
          <span className="font-semibold text-text">{commission.brokerName}</span>
        </div>
        <div className="text-small text-text-muted">
          Booking: <span className="font-mono text-text">{commission.bookingNumber}</span>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-2 text-small">
          <span className="text-text-muted">Approved Commission:</span>
          <span className="text-h3 font-semibold text-primary tabular-nums">
            {formatMoney(BigInt(commission.amountPaisa))}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField id="commission-pay-method" label="Payment Method">
          <Select
            id="commission-pay-method"
            value={paymentMethod}
            onChange={(val) => setPaymentMethod(val as 'CASH' | 'BANK_TRANSFER' | 'CHEQUE')}
            options={paymentMethodOptions}
          />
        </FormField>

        {paymentMethod !== 'CASH' && (
          <FormField id="commission-bank-account" label="Corporate Bank Account">
            <Select
              id="commission-bank-account"
              value={bankAccountId}
              onChange={(val) => setBankAccountId(val)}
              options={bankAccountOptions}
            />
          </FormField>
        )}

        <FormField
          id="commission-reference"
          label={paymentMethod === 'CHEQUE' ? 'Cheque Number' : 'Transaction Reference / TrxID'}
        >
          <Input
            id="commission-reference"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder={paymentMethod === 'CHEQUE' ? 'e.g. CQ-398102' : 'e.g. TR-COMM-891'}
          />
        </FormField>

        <FormField id="commission-notes" label="Notes / Remarks">
          <Input
            id="commission-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Commission disbursement notes..."
          />
        </FormField>

        <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            onClick={(e) => {
              e.preventDefault();
              handleSubmit(e);
            }}
            disabled={isSubmitting}
            isLoading={isSubmitting}
          >
            Disburse Payout
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
