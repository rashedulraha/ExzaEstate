import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import type {
  BookingTransferInput,
  BookingTransferResult,
} from '../../schemas/operations.schema.js';
import {
  getStepBadgeClass,
  TransferSuccessView,
  TransferNavButtons,
  Step1SelectBooking,
  Step2SelectTransferee,
  Step3FeeReason,
  Step4Summary,
} from './BookingTransferSteps.js';

export type { BookingOption, CustomerOption } from './transfer.types.js';
import type { BookingOption, CustomerOption } from './transfer.types.js';

export interface BookingTransferWizardProps {
  bookings: BookingOption[];
  customers: CustomerOption[];
  onExecute: (input: BookingTransferInput) => Promise<BookingTransferResult>;
  onSuccess?: (result: BookingTransferResult) => void;
  onCancel?: () => void;
}

function checkCanProceed(
  step: number,
  bookingId: string,
  transfereeId: string,
  originalCustomerId?: string,
  reasonText = '',
): boolean {
  if (step === 1) return Boolean(bookingId);
  if (step === 2) return Boolean(transfereeId) && transfereeId !== originalCustomerId;
  if (step === 3) return Boolean(reasonText.trim());
  return true;
}

function TransferStepContent({
  step,
  bookings,
  customers,
  selectedBookingId,
  transfereeCustomerId,
  fee,
  reason,
  onSelectBooking,
  onSelectTransferee,
  onChangeFee,
  onChangeReason,
  selectedBooking,
  transfereeCustomer,
}: {
  step: number;
  bookings: BookingOption[];
  customers: CustomerOption[];
  selectedBookingId: string;
  transfereeCustomerId: string;
  fee: string;
  reason: string;
  onSelectBooking: (id: string) => void;
  onSelectTransferee: (id: string) => void;
  onChangeFee: (v: string) => void;
  onChangeReason: (v: string) => void;
  selectedBooking?: BookingOption;
  transfereeCustomer?: CustomerOption;
}) {
  if (step === 1) {
    return (
      <Step1SelectBooking
        bookings={bookings}
        selectedBookingId={selectedBookingId}
        onSelect={onSelectBooking}
      />
    );
  }
  if (step === 2) {
    return (
      <Step2SelectTransferee
        customers={customers}
        selectedCustomerId={transfereeCustomerId}
        originalCustomerId={selectedBooking?.customerId}
        onSelect={onSelectTransferee}
      />
    );
  }
  if (step === 3) {
    return (
      <Step3FeeReason
        fee={fee}
        reason={reason}
        onChangeFee={onChangeFee}
        onChangeReason={onChangeReason}
      />
    );
  }
  return <Step4Summary booking={selectedBooking} transferee={transfereeCustomer} fee={fee} />;
}

export function BookingTransferWizard({
  bookings,
  customers,
  onExecute,
  onSuccess,
  onCancel,
}: BookingTransferWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [transfereeCustomerId, setTransfereeCustomerId] = useState('');
  const [transferFeeTaka, setTransferFeeTaka] = useState('25000');
  const [reason, setReason] = useState(
    'Mutual consent ownership transfer requested by original buyer',
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BookingTransferResult | null>(null);

  const selectedBooking = bookings.find((b) => b.id === selectedBookingId);
  const transfereeCustomer = customers.find((c) => c.id === transfereeCustomerId);

  const handleNext = () => {
    setError(null);
    if (step === 1 && selectedBookingId) return setStep(2);
    if (step === 2) {
      if (transfereeCustomerId === selectedBooking?.customerId) {
        return setError('Transferee customer must be different from the original customer');
      }
      if (transfereeCustomerId) return setStep(3);
    }
    if (step === 3 && reason.trim()) setStep(4);
  };

  const handleBack = () => {
    setError(null);
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
    else if (step === 4) setStep(3);
  };

  const handleExecute = async () => {
    if (!selectedBooking || !transfereeCustomer) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const feePaisa = BigInt(
        Math.max(0, Math.round(parseFloat(transferFeeTaka || '0') * 100)),
      ).toString();
      const res = await onExecute({
        originalBookingId: selectedBooking.id,
        transfereeCustomerId: transfereeCustomer.id,
        transferFeePaisa: feePaisa,
        reason: reason.trim(),
        executeImmediately: true,
      });
      setResult(res);
      onSuccess?.(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to execute booking transfer');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (result) {
    return (
      <TransferSuccessView
        result={result}
        bookingNumber={selectedBooking?.bookingNumber}
        transfereeName={transfereeCustomer?.name}
      />
    );
  }

  const canProceed = checkCanProceed(
    step,
    selectedBookingId,
    transfereeCustomerId,
    selectedBooking?.customerId,
    reason,
  );

  return (
    <div className="card-surface p-6">
      <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-h2 font-semibold text-text">Booking Ownership Transfer Wizard</h2>
          <p className="text-caption text-text-muted">
            Step {step} of 4: Atomic Ownership Succession
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-caption">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`flex h-6 w-6 items-center justify-center rounded-full text-caption font-semibold ${getStepBadgeClass(step, s)}`}
            >
              {s}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-card border border-danger/30 bg-danger/10 p-3 text-caption text-danger">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <TransferStepContent
        step={step}
        bookings={bookings}
        customers={customers}
        selectedBookingId={selectedBookingId}
        transfereeCustomerId={transfereeCustomerId}
        fee={transferFeeTaka}
        reason={reason}
        onSelectBooking={setSelectedBookingId}
        onSelectTransferee={setTransfereeCustomerId}
        onChangeFee={setTransferFeeTaka}
        onChangeReason={setReason}
        selectedBooking={selectedBooking}
        transfereeCustomer={transfereeCustomer}
      />

      <TransferNavButtons
        step={step}
        canProceed={canProceed}
        isSubmitting={isSubmitting}
        onBack={handleBack}
        onCancel={onCancel}
        onNext={handleNext}
        onExecute={handleExecute}
      />
    </div>
  );
}
