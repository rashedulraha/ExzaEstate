import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { PaymentTerrace, Input, Button } from '@exzaestate/ui';
import { Search } from 'lucide-react';
import { useInstallmentList } from '../hooks/useInstallmentList.js';
import { usePaymentActions } from '../hooks/usePaymentActions.js';
import { InstallmentDataTable } from '../components/installments/InstallmentDataTable.js';
import { PaymentEntryModal } from '../components/payments/PaymentEntryModal.js';
import type { InstallmentScheduleItem } from '../schemas/collection.schema.js';

export function InstallmentSchedulePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialBookingId = searchParams.get('bookingId') || '';
  const [bookingIdInput, setBookingIdInput] = useState(initialBookingId);
  const [activeBookingId, setActiveBookingId] = useState(initialBookingId);

  const { installments, terraceBlocks, isLoading, refetch } = useInstallmentList(activeBookingId);
  const { createDraftPayment, postPayment } = usePaymentActions();

  const [paymentTarget, setPaymentTarget] = useState<InstallmentScheduleItem | null>(null);

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    const clean = bookingIdInput.trim();
    setActiveBookingId(clean);
    if (clean) {
      setSearchParams({ bookingId: clean });
    } else {
      setSearchParams({});
    }
  };

  return (
    <div className="space-y-6" data-testid="installment-schedule-page">
      {/* Page Title & Search Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 font-bold text-text">Installment Schedule & Collection Health</h1>
          <p className="text-small text-text-muted mt-1">
            Visualise payment progress, timing health, and upcoming milestones via Payment Terrace.
          </p>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative w-72">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              id="bookingIdInput"
              placeholder="Search by Booking ID / Code..."
              value={bookingIdInput}
              onChange={(e) => setBookingIdInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary">
            Lookup
          </Button>
        </form>
      </div>

      {/* Signature Payment Terrace Component */}
      <div className="p-6 rounded-card border border-border bg-surface space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-h3 font-bold text-text">Payment Terrace</h3>
            <p className="text-caption text-text-muted">
              Height reflects installment amount. Bottom-up fill indicates collected amount.
            </p>
          </div>
          {activeBookingId && (
            <span className="text-caption font-mono px-2.5 py-1 rounded-full bg-surface-sunken border border-border text-text">
              Booking: {activeBookingId}
            </span>
          )}
        </div>

        {terraceBlocks.length > 0 ? (
          <PaymentTerrace items={terraceBlocks} variant="full" className="pt-2" />
        ) : (
          <div className="py-12 text-center text-text-muted border border-dashed border-border rounded-card">
            {activeBookingId
              ? 'No installment blocks found for this booking.'
              : 'Enter a Booking ID above to render the customer payment terrace.'}
          </div>
        )}
      </div>

      {/* Installment Data Table */}
      <div className="space-y-3">
        <h3 className="text-h3 font-bold text-text">Schedule Ledger</h3>
        <InstallmentDataTable
          installments={installments}
          isLoading={isLoading}
          onPayInstallment={(item) => setPaymentTarget(item)}
        />
      </div>

      {/* Payment Entry Modal */}
      {paymentTarget && (
        <PaymentEntryModal
          isOpen={Boolean(paymentTarget)}
          onClose={() => setPaymentTarget(null)}
          bookingId={paymentTarget.bookingId || activeBookingId}
          dueAmountPaisa={paymentTarget.remainingPaisa}
          onSubmitDraft={async (data) => {
            await createDraftPayment(data);
            refetch();
          }}
          onSubmitPost={async (data) => {
            const res = await createDraftPayment(data);
            if (res?.id) {
              await postPayment(res.id);
            }
            refetch();
          }}
        />
      )}
    </div>
  );
}
