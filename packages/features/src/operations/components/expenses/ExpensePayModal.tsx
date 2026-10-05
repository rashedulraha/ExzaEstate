import { useState } from 'react';
import { formatMoney } from '@exzaestate/shared';
import { Dialog, Button, FormField, Input, Select } from '@exzaestate/ui';
import type {
  ExpenseVoucherItem,
  ExpensePaymentMethodEnum,
} from '../../schemas/operations.schema.js';

export interface ExpensePayModalProps {
  isOpen: boolean;
  onClose: () => void;
  voucher: ExpenseVoucherItem | null;
  onPay: (input: {
    paymentMethod: ExpensePaymentMethodEnum;
    bankAccountId?: string;
    bankAccountCode?: string;
    reference?: string;
  }) => Promise<void>;
  bankAccounts?: Array<{ id: string; name: string; accountNumber: string; code?: string }>;
}

export function ExpensePayModal({
  isOpen,
  onClose,
  voucher,
  onPay,
  bankAccounts = [],
}: ExpensePayModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<ExpensePaymentMethodEnum>('BANK_TRANSFER');
  const [bankAccountId, setBankAccountId] = useState('');
  const [reference, setReference] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !voucher) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const selectedAccount = bankAccounts.find((b) => b.id === bankAccountId);
      await onPay({
        paymentMethod,
        bankAccountId: paymentMethod !== 'CASH' ? bankAccountId : undefined,
        bankAccountCode: selectedAccount?.code,
        reference: reference.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to record expense payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const paymentMethodOptions = [
    { label: 'Bank Transfer / EFT', value: 'BANK_TRANSFER' },
    { label: 'Bank Cheque', value: 'CHEQUE' },
    { label: 'Petty Cash', value: 'CASH' },
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
      title="Disburse Expense Voucher"
      description={voucher.voucherNumber}
      size="md"
    >
      {error && (
        <div className="mb-4 rounded-card border border-danger/30 bg-danger/10 p-3 text-caption text-danger">
          {error}
        </div>
      )}

      <div className="mb-4 rounded-card border border-border bg-surface-sunken/40 p-3.5 space-y-2">
        <div className="flex items-center justify-between text-small">
          <span className="text-text-muted">Payee:</span>
          <span className="font-medium text-text">{voucher.payeeName}</span>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-2 text-small">
          <span className="text-text-muted">Amount to Disburse:</span>
          <span className="text-h3 font-semibold text-primary tabular-nums">
            {formatMoney(BigInt(voucher.amountPaisa))}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField id="expense-pay-method" label="Payment Method">
          <Select
            id="expense-pay-method"
            value={paymentMethod}
            onChange={(val) => setPaymentMethod(val as ExpensePaymentMethodEnum)}
            options={paymentMethodOptions}
          />
        </FormField>

        {paymentMethod !== 'CASH' && (
          <FormField id="expense-bank-account" label="Disbursing Bank Account">
            <Select
              id="expense-bank-account"
              value={bankAccountId}
              onChange={(val) => setBankAccountId(val)}
              options={bankAccountOptions}
            />
          </FormField>
        )}

        <FormField
          id="expense-reference"
          label={paymentMethod === 'CHEQUE' ? 'Cheque Number' : 'Transaction Reference / TrxID'}
        >
          <Input
            id="expense-reference"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder={paymentMethod === 'CHEQUE' ? 'e.g. CQ-9082341' : 'e.g. TR-2026-X189'}
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
            Confirm & Disburse
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
