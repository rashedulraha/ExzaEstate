import { useState, type FormEvent } from 'react';
import { Dialog, FormField, Input, Select, Button } from '@exzaestate/ui';
import { formatMoney } from '@exzaestate/shared';
import { ArrowRight } from 'lucide-react';
import type { CashBankAccountItem, CashTransferInput } from '../../schemas/accounting.schema.js';

export interface BankTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: CashBankAccountItem[];
  onSubmit: (input: CashTransferInput) => Promise<unknown>;
  isSubmitting?: boolean;
}

function calculateAmountPaisa(amountTaka: string): string {
  const clean = amountTaka.replace(/\D/g, '');
  return clean ? (BigInt(clean) * 100n).toString() : '0';
}

function validateBankTransfer(
  sourceId: string,
  destId: string,
  amountTaka: string,
  amountPaisa: string,
): Record<string, string> {
  const errs: Record<string, string> = {};
  if (!sourceId) errs.sourceId = 'Source account is required';
  if (!destId) errs.destId = 'Destination account is required';
  if (sourceId && destId && sourceId === destId) {
    errs.destId = 'Destination must be different from source account';
  }
  if (!amountTaka || BigInt(amountPaisa) <= 0n) {
    errs.amount = 'Transfer amount must be greater than zero';
  }
  return errs;
}

export function BankTransferModal({
  isOpen,
  onClose,
  accounts,
  onSubmit,
  isSubmitting = false,
}: BankTransferModalProps) {
  const [sourceId, setSourceId] = useState('');
  const [destId, setDestId] = useState('');
  const [amountTaka, setAmountTaka] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState('');
  const [narration, setNarration] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const amountPaisa = calculateAmountPaisa(amountTaka);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const newErrors = validateBankTransfer(sourceId, destId, amountTaka, amountPaisa);
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    await onSubmit({
      sourceBankAccountId: sourceId,
      destinationBankAccountId: destId,
      amountPaisa,
      transferDate,
      referenceNumber: reference.trim() || undefined,
      narration: narration.trim() || undefined,
    });

    onClose();
  };

  const accountOptions = accounts.map((a) => ({
    value: a.id,
    label: `${a.accountName} (${formatMoney(a.currentBalancePaisa)})`,
  }));

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Internal Treasury & Bank Transfer"
      description="Transfer funds between liquid company accounts with automatic balanced posting (RULE-DOUBLE-ENTRY)"
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
            data-testid="confirm-cash-transfer-btn"
          >
            Execute Transfer
          </Button>
        </div>
      }
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-4 text-text"
        data-testid="cash-transfer-form"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            id="sourceAccount"
            label="Source Account (Credit)"
            required
            error={errors.sourceId}
          >
            <Select
              id="sourceAccount"
              placeholder="Select source account..."
              value={sourceId}
              options={accountOptions}
              onChange={(val) => setSourceId(val)}
              disabled={isSubmitting}
            />
          </FormField>

          <FormField
            id="destAccount"
            label="Destination Account (Debit)"
            required
            error={errors.destId}
          >
            <Select
              id="destAccount"
              placeholder="Select destination account..."
              value={destId}
              options={accountOptions}
              onChange={(val) => setDestId(val)}
              disabled={isSubmitting}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            id="transferAmount"
            label="Transfer Amount (BDT)"
            required
            error={errors.amount}
          >
            <Input
              id="transferAmount"
              placeholder="e.g. 5,00,000"
              value={amountTaka}
              onChange={(e) => setAmountTaka(e.target.value)}
              disabled={isSubmitting}
            />
          </FormField>

          <FormField id="transferDate" label="Transfer Date" required>
            <Input
              id="transferDate"
              type="date"
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
              disabled={isSubmitting}
            />
          </FormField>
        </div>

        <FormField id="transferReference" label="Bank Reference / Advice #">
          <Input
            id="transferReference"
            placeholder="e.g. Cheque # or RTGS / BEFTN reference"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            disabled={isSubmitting}
          />
        </FormField>

        <FormField id="transferNarration" label="Narration / Description">
          <Input
            id="transferNarration"
            placeholder="e.g. Replenish branch petty cash / inter-account rebalancing"
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            disabled={isSubmitting}
          />
        </FormField>

        {BigInt(amountPaisa) > 0n && (
          <div className="p-3 rounded-card bg-surface-sunken border border-border text-caption flex items-center justify-between">
            <span className="font-medium text-text">Journal Posting Preview:</span>
            <div className="flex items-center gap-2 font-mono text-text">
              <span>Dr Destination {formatMoney(amountPaisa)}</span>
              <ArrowRight className="w-3.5 h-3.5 text-text-muted" />
              <span>Cr Source {formatMoney(amountPaisa)}</span>
            </div>
          </div>
        )}
      </form>
    </Dialog>
  );
}
