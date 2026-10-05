import { useState } from 'react';
import { Building2 } from 'lucide-react';
import { formatMoney } from '@exzaestate/shared';
import { Dialog, Button, FormField, Input, Select } from '@exzaestate/ui';
import type { CreateVendorPaymentInput, VendorItem } from '../../schemas/operations.schema.js';

export interface VendorPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateVendorPaymentInput) => Promise<void>;
  vendor: VendorItem | null;
  bankAccounts?: Array<{ id: string; name: string; accountNumber: string; code?: string }>;
}

export function VendorPaymentModal({
  isOpen,
  onClose,
  onSubmit,
  vendor,
  bankAccounts = [],
}: VendorPaymentModalProps) {
  const [amountTaka, setAmountTaka] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'CHEQUE'>(
    'BANK_TRANSFER',
  );
  const [bankAccountId, setBankAccountId] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !vendor) return null;

  const outstandingPaisa = BigInt(vendor.outstandingBalancePaisa ?? '0');

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const amountVal = parseFloat(amountTaka);
    if (isNaN(amountVal) || amountVal <= 0) {
      setError('Please enter a valid disbursement amount');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const selectedAccount = bankAccounts.find((b) => b.id === bankAccountId);
      await onSubmit({
        vendorId: vendor.id,
        amountPaisa: BigInt(Math.round(amountVal * 100)).toString(),
        paymentMethod,
        bankAccountId: paymentMethod !== 'CASH' ? bankAccountId : undefined,
        bankAccountCode: selectedAccount?.code,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to record vendor payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const paymentMethodOptions = [
    { label: 'Bank Transfer / BEFTN / RTGS', value: 'BANK_TRANSFER' },
    { label: 'Cheque', value: 'CHEQUE' },
    { label: 'Cash', value: 'CASH' },
  ];

  const bankAccountOptions = [
    { label: 'Select corporate bank account...', value: '' },
    ...bankAccounts.map((acc) => ({
      label: `${acc.name} (${acc.accountNumber})`,
      value: acc.id,
    })),
  ];

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Disburse AP Payment"
      description="Vendor Accounts Payable Settlement"
      size="md"
    >
      {error && (
        <div className="mb-4 rounded-card border border-danger/30 bg-danger/10 p-3 text-caption text-danger">
          {error}
        </div>
      )}

      <div className="mb-4 rounded-card border border-border bg-surface-sunken/40 p-3.5 space-y-2">
        <div className="flex items-center gap-2 text-small">
          <Building2 className="h-4 w-4 text-accent" />
          <span className="font-medium text-text">{vendor.name}</span>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-2 text-small">
          <span className="text-text-muted">Outstanding Payable (AP):</span>
          <span className="text-h3 font-semibold text-primary tabular-nums">
            {formatMoney(outstandingPaisa)}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField id="vendor-pay-amount" label="Payment Amount (৳)" required>
          <Input
            id="vendor-pay-amount"
            type="number"
            step="0.01"
            min="1"
            required
            value={amountTaka}
            onChange={(e) => setAmountTaka(e.target.value)}
            placeholder="e.g. 250000"
          />
        </FormField>

        <FormField id="vendor-pay-method" label="Payment Method">
          <Select
            id="vendor-pay-method"
            value={paymentMethod}
            onChange={(val) => setPaymentMethod(val as 'CASH' | 'BANK_TRANSFER' | 'CHEQUE')}
            options={paymentMethodOptions}
          />
        </FormField>

        {paymentMethod !== 'CASH' && (
          <FormField id="vendor-pay-bank" label="Disbursing Bank Account">
            <Select
              id="vendor-pay-bank"
              value={bankAccountId}
              onChange={(val) => setBankAccountId(val)}
              options={bankAccountOptions}
            />
          </FormField>
        )}

        <FormField
          id="vendor-pay-ref"
          label={paymentMethod === 'CHEQUE' ? 'Cheque Number' : 'Transaction Reference / TrxID'}
        >
          <Input
            id="vendor-pay-ref"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder={paymentMethod === 'CHEQUE' ? 'e.g. CQ-992120' : 'e.g. TR-2026-V871'}
          />
        </FormField>

        <FormField id="vendor-pay-notes" label="Internal Notes">
          <Input
            id="vendor-pay-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Payment remarks or reference details..."
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
            Disburse AP Settlement
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
