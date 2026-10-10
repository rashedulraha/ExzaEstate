import { type ReactElement, useState } from 'react';
import { Dialog, Button, FormField, Input, StatusBadge } from '@exzaestate/ui';
import { formatDate } from '@exzaestate/shared';
import type { AgreementItem } from '../../schemas/agreement.schema.js';

interface AgreementViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  agreement: AgreementItem | null;
  onSignAndLock: (id: string, notes: string) => Promise<void>;
  isLoading: boolean;
}

export function AgreementViewerModal({
  isOpen,
  onClose,
  agreement,
  onSignAndLock,
  isLoading,
}: AgreementViewerModalProps): ReactElement {
  const [isSigning, setIsSigning] = useState(false);
  const [notes, setNotes] = useState('');

  if (!agreement) return <></>;

  const handleConfirmLock = async () => {
    if (!notes.trim()) return;
    await onSignAndLock(agreement.id, notes.trim());
    setIsSigning(false);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`${agreement.title} (${agreement.agreementNumber})`}
      description={`Legal instrument version ${agreement.version}`}
      size="lg"
      footer={
        <div className="flex justify-between items-center w-full">
          <div>
            {agreement.status === 'AGREEMENT_PENDING' && !isSigning && (
              <Button variant="primary" onClick={() => setIsSigning(true)}>
                Sign & Lock Instrument
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            {isSigning ? (
              <>
                <Button
                  variant="secondary"
                  onClick={() => setIsSigning(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleConfirmLock}
                  isLoading={isLoading}
                  disabled={!notes.trim()}
                >
                  Confirm Legal Lock
                </Button>
              </>
            ) : (
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex justify-between items-center p-3 bg-surface-sunken border border-border rounded-card text-small">
          <div>
            <span className="text-text-muted">Status:</span>{' '}
            <StatusBadge domain="agreement" value={agreement.status} />
          </div>
          <div className="text-caption text-text-muted">
            Created: {formatDate(agreement.createdAt, 'Asia/Dhaka')}
          </div>
        </div>

        {isSigning ? (
          <div className="p-4 border border-warning/30 bg-warning/12 rounded-card space-y-4">
            <h4 className="text-h3 font-bold text-text">Execute & Lock Agreement Permanently</h4>
            <p className="text-caption text-text-muted">
              Once locked, this agreement becomes a permanent legal record. Any subsequent
              modifications will generate version {agreement.version + 1} with complete revision
              tracking.
            </p>
            <FormField id="signing-notes" label="Execution & Signing Remarks" required>
              <Input
                id="signing-notes"
                placeholder="e.g. Executed in presence of legal counsel and registered."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </FormField>
          </div>
        ) : (
          <div className="p-6 border border-border rounded-card bg-surface-raised space-y-4 max-h-96 overflow-y-auto font-serif text-small leading-relaxed text-text-2">
            <h3 className="font-bold text-h2 text-text text-center">
              AGREEMENT FOR SALE AND ALLOTMENT OF REAL ESTATE
            </h3>
            <p>
              This Agreement for Allotment and Sale is made and entered into on this day between the
              Developer (&quot;ExzaEstate&quot;) and the Purchaser (&quot;Allottee&quot;) for the
              designated immovable property.
            </p>
            <p>
              <strong>1. ALLOTMENT TERMS:</strong> The Developer hereby allots and the Allottee
              accepts the booking of the target unit in accordance with the agreed payment schedule
              and specifications.
            </p>
            <p>
              <strong>2. DEFAULT AND CANCELLATION:</strong> In the event the Allottee fails to pay
              consecutive installments within the grace period, the Developer retains the right to
              cancel this allotment pursuant to statutory guidelines.
            </p>
            <p>
              <strong>3. POSSESSION:</strong> Handover of the demised premises shall be completed
              within the stipulated timeline upon receipt of full and final settlement.
            </p>
          </div>
        )}
      </div>
    </Dialog>
  );
}
