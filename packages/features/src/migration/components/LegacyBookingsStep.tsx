import { useState } from 'react';
import { Plus, Receipt } from 'lucide-react';
import { Button, EmptyState } from '@exzaestate/ui';
import { formatMoney } from '@exzaestate/shared';
import type { LegacyBookingFormData } from '../schemas/migration.schema.js';
import { LegacyBookingModal } from './LegacyBookingModal.js';

export interface LegacyBookingsStepProps {
  batchId: string;
  onAddBooking: (batchId: string, data: LegacyBookingFormData) => Promise<unknown>;
  isAdding: boolean;
}

export function LegacyBookingsStep({ batchId, onAddBooking, isAdding }: LegacyBookingsStepProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [localBookings, setLocalBookings] = useState<LegacyBookingFormData[]>([]);

  const handleAdd = async (data: LegacyBookingFormData) => {
    await onAddBooking(batchId, data);
    setLocalBookings((prev) => [...prev, data]);
  };

  return (
    <div className="rounded-card border border-border bg-surface p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-h3 font-semibold text-text">
            Step 2: Legacy Bookings & Installments
          </h3>
          <p className="text-body-sm text-text-muted mt-0.5">
            Record pre-existing customer bookings. System tracks old receipt references without
            posting duplicate revenue during historical cutover.
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsModalOpen(true)}
        >
          Add Legacy Booking
        </Button>
      </div>

      {localBookings.length === 0 ? (
        <EmptyState
          icon={<Receipt className="w-8 h-8" />}
          title="No Legacy Bookings Added"
          description="No pre-existing customer bookings have been recorded in this cutover batch. Add historical records individually or upload in bulk via CSV."
          dashedBorder
          actionLabel="Add Legacy Booking"
          actionVariant="secondary"
          actionIcon={<Plus className="w-4 h-4" />}
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="overflow-x-auto border border-border rounded-card">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-sunken/40 text-caption font-semibold text-text-muted uppercase">
                <th className="py-2.5 px-3">Agreement No</th>
                <th className="py-2.5 px-3">Customer ID</th>
                <th className="py-2.5 px-3">Booking Date</th>
                <th className="py-2.5 px-3 text-right">Net Price</th>
                <th className="py-2.5 px-3 text-right">Total Paid</th>
                <th className="py-2.5 px-3 text-right">Outstanding AR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-body-sm">
              {localBookings.map((b) => {
                const net = BigInt(b.netPricePaisa);
                const paid = BigInt(b.totalPaidPaisa);
                const outstanding = net - paid;

                return (
                  <tr key={b.legacyBookingNo} className="hover:bg-surface-sunken/20">
                    <td className="py-3 px-3 font-mono font-medium text-primary">
                      {b.legacyBookingNo}
                    </td>
                    <td className="py-3 px-3 font-mono text-text">{b.customerId}</td>
                    <td className="py-3 px-3 text-text-muted">{b.bookingDate}</td>
                    <td className="py-3 px-3 text-right font-mono text-text">{formatMoney(net)}</td>
                    <td className="py-3 px-3 text-right font-mono text-success">
                      {formatMoney(paid)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-text">
                      {formatMoney(outstanding)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <LegacyBookingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAdd}
        isSubmitting={isAdding}
      />
    </div>
  );
}
