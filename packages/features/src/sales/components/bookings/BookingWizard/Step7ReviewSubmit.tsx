import type { ReactElement } from 'react';
import type { UseFormWatch } from 'react-hook-form';
import { formatMoney } from '@exzaestate/shared';
import type { BookingWizardInput } from '../../../schemas/booking.schema.js';

interface Step7ReviewSubmitProps {
  watch: UseFormWatch<BookingWizardInput>;
}

export function Step7ReviewSubmit({ watch }: Step7ReviewSubmitProps): ReactElement {
  const values = watch();
  const coBuyers = values.coBuyers || [];
  const totalCoBuyerShare = coBuyers.reduce(
    (acc, curr) => acc + (Number(curr.sharePercentage) || 0),
    0,
  );
  const primaryShare = Math.max(0, 100 - totalCoBuyerShare);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-h3 font-semibold text-text">Step 7: Final Review & Submission</h3>
        <p className="text-caption text-text-muted mt-0.5">
          Verify commercial terms and allottee allocations before placing the atomic row lock.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-surface-sunken border border-border rounded-card space-y-3">
          <h4 className="text-h5 font-semibold text-text-muted uppercase tracking-wider">
            Allottee & Co-Buyers
          </h4>
          <div className="text-small space-y-1.5">
            <div className="flex justify-between">
              <span className="text-text-muted">Primary Buyer:</span>
              <span className="font-semibold text-text">
                {values.customerName || values.customerId || 'Not specified'} ({primaryShare}%)
              </span>
            </div>
            {coBuyers.map((cb, idx) => (
              <div key={`review-cb-${idx}`} className="flex justify-between text-caption">
                <span className="text-text-muted">Co-Buyer #{idx + 1}:</span>
                <span className="text-text">
                  {cb.customerId.slice(0, 8)}... ({cb.sharePercentage}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-surface-sunken border border-border rounded-card space-y-3">
          <h4 className="text-h5 font-semibold text-text-muted uppercase tracking-wider">
            Commercial Pricing & Hold
          </h4>
          <div className="text-small space-y-1.5">
            <div className="flex justify-between">
              <span className="text-text-muted">Net Contract Price:</span>
              <span className="font-bold text-primary">
                {formatMoney(values.netPricePaisa || '0')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Initial Earnest Deposit:</span>
              <span className="font-semibold text-text">
                {formatMoney(values.bookingAmountPaisa || '0')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Hold Duration:</span>
              <span className="font-semibold text-accent">
                {values.reservationHoldHours || 72} Hours
              </span>
            </div>
          </div>
        </div>
      </div>

      {Number(values.discountPercentage) > 0 && (
        <div className="p-3 bg-warning/12 border border-warning/20 rounded-card text-caption text-warning">
          <strong>Notice:</strong> This booking includes a {values.discountPercentage}% discount and
          will transition into <code>PENDING_APPROVAL</code> status upon submission.
        </div>
      )}

      <div className="p-4 border border-border rounded-card bg-surface space-y-2 text-caption text-text-muted">
        <div className="font-semibold text-text">Idempotency & Concurrency Guarantee</div>
        <p>
          Submitting this wizard acquires an exclusive pessimistic lock on the target unit in
          PostgreSQL, preventing simultaneous double-booking across all cloud and local desktop
          instances.
        </p>
      </div>
    </div>
  );
}
