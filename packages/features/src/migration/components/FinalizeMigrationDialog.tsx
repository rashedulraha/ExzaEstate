import { useState } from 'react';
import { Dialog, Button, FormField, Input } from '@exzaestate/ui';

export interface FinalizeMigrationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onFinalize: (reason?: string) => Promise<unknown>;
  isCanFinalize: boolean;
  isFinalizing: boolean;
}

export function FinalizeMigrationDialog({
  isOpen,
  onClose,
  onFinalize,
  isCanFinalize,
  isFinalizing,
}: FinalizeMigrationDialogProps) {
  const [adjustmentReason, setAdjustmentReason] = useState('');

  const handleConfirm = async () => {
    await onFinalize(adjustmentReason.trim() || undefined);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Finalize Go-Live Migration Batch"
      description="Lock historical migration records and transition legacy bookings to live active contracts."
    >
      <div className="space-y-4">
        <p className="text-body-sm text-text leading-relaxed">
          Finalizing this migration batch will permanently seal all opening balances and legacy
          agreement allocations. Historical transactions prior to the cut-over date cannot be
          altered or removed after locking.
        </p>

        {!isCanFinalize && (
          <FormField
            label="Approved Adjustment Justification"
            id="adjustment-reason"
            helperText="Required when net reconciliation discrepancy is not BDT 0.00"
          >
            <Input
              id="adjustment-reason"
              value={adjustmentReason}
              onChange={(e) => setAdjustmentReason(e.target.value)}
              placeholder="e.g. Board approved BDT 500 rounding discrepancy write-off"
              required
            />
          </FormField>
        )}

        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-border">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            isLoading={isFinalizing}
            disabled={!isCanFinalize && !adjustmentReason.trim()}
          >
            Confirm & Lock Migration
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
