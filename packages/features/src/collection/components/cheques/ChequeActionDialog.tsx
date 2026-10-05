import type { ReactElement } from 'react';
import { formatMoney } from '@exzaestate/shared';
import { Button, Dialog, FormField, Input } from '@exzaestate/ui';
import type { ChequeLedgerItem } from '../../schemas/collection.schema.js';

export interface ChequeActionDialogProps {
  activeCheque: ChequeLedgerItem | null;
  modalMode: 'CLEAR' | 'BOUNCE' | null;
  bounceReason: string;
  notes: string;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onBounceReasonChange: (val: string) => void;
  onNotesChange: (val: string) => void;
}

function getDialogMeta(isClear: boolean) {
  if (isClear) {
    return {
      title: 'Clear Cheque',
      actionLabel: 'Confirm Clearance & Post',
      variant: 'primary' as const,
    };
  }
  return {
    title: 'Record Bounced Cheque',
    actionLabel: 'Confirm Cheque Bounce',
    variant: 'destructive' as const,
  };
}

interface ChequeActionInputsProps {
  isClear: boolean;
  notes: string;
  bounceReason: string;
  isSubmitting: boolean;
  onNotesChange: (val: string) => void;
  onBounceReasonChange: (val: string) => void;
}

function ChequeActionInputs({
  isClear,
  notes,
  bounceReason,
  isSubmitting,
  onNotesChange,
  onBounceReasonChange,
}: ChequeActionInputsProps) {
  if (isClear) {
    return (
      <FormField id="clearNotes" label="Clearing Memo / Notes (Optional)">
        <Input
          id="clearNotes"
          placeholder="e.g. Cleared via BEFTN / clearing house batch # 4910"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          disabled={isSubmitting}
        />
      </FormField>
    );
  }
  return (
    <FormField
      id="bounceReason"
      label="Bounce Reason"
      required
      helperText="Specify the bank dishonour reason (insufficient balance, signature mismatch, etc.)"
    >
      <Input
        id="bounceReason"
        placeholder="e.g. Return memo: Insufficient fund in drawer account"
        value={bounceReason}
        onChange={(e) => onBounceReasonChange(e.target.value)}
        disabled={isSubmitting}
      />
    </FormField>
  );
}

export function ChequeActionDialog({
  activeCheque,
  modalMode,
  bounceReason,
  notes,
  isSubmitting,
  onClose,
  onConfirm,
  onBounceReasonChange,
  onNotesChange,
}: ChequeActionDialogProps): ReactElement | null {
  if (!activeCheque || !modalMode) return null;

  const isClear = modalMode === 'CLEAR';
  const meta = getDialogMeta(isClear);
  const drawerName = activeCheque.drawerName ? activeCheque.drawerName : activeCheque.customerName;

  return (
    <Dialog
      isOpen={Boolean(modalMode && activeCheque)}
      onClose={onClose}
      title={meta.title}
      description={`Cheque #${activeCheque.chequeNumber} · ${formatMoney(activeCheque.amountPaisa || '0')}`}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant={meta.variant}
            onClick={onConfirm}
            isLoading={isSubmitting}
            disabled={isSubmitting}
            data-testid="confirm-cheque-action"
          >
            {meta.actionLabel}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="p-3 rounded-card bg-surface-sunken border border-border text-small space-y-1">
          <div className="flex justify-between">
            <span className="text-text-muted">Bank:</span>
            <span className="font-medium text-text">{activeCheque.bankName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Drawer:</span>
            <span className="font-medium text-text">{drawerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Amount:</span>
            <span className="font-semibold text-text tabular-nums">
              {formatMoney(activeCheque.amountPaisa || '0')}
            </span>
          </div>
        </div>

        <ChequeActionInputs
          isClear={isClear}
          notes={notes}
          bounceReason={bounceReason}
          isSubmitting={isSubmitting}
          onNotesChange={onNotesChange}
          onBounceReasonChange={onBounceReasonChange}
        />
      </div>
    </Dialog>
  );
}
