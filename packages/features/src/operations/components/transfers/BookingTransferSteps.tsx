import { ArrowRight, ArrowLeft, CheckCircle2, RefreshCw } from 'lucide-react';
import { formatMoney } from '@exzaestate/shared';
import { Button, FormField, Input } from '@exzaestate/ui';
import type { BookingOption, CustomerOption } from './transfer.types.js';
import type { BookingTransferResult } from '../../schemas/operations.schema.js';

export function getStepBadgeClass(currentStep: number, stepIndex: number): string {
  if (currentStep === stepIndex) return 'bg-primary text-text-inverse';
  if (currentStep > stepIndex) return 'bg-success/20 text-success';
  return 'bg-surface-sunken text-text-muted border border-border';
}

export function TransferSuccessView({
  result,
  bookingNumber,
  transfereeName,
}: {
  result: BookingTransferResult;
  bookingNumber?: string;
  transfereeName?: string;
}) {
  return (
    <div className="rounded-card border border-success/30 bg-success/10 p-6 text-center">
      <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-success" />
      <h3 className="text-h3 font-semibold text-text">Booking Transfer Executed Successfully</h3>
      <p className="mt-1 text-caption text-text-2">
        Transfer Reference:{' '}
        <span className="font-mono text-primary font-bold">{result.transferNumber}</span>
      </p>
      <div className="mt-4 space-y-2 rounded-card border border-border bg-surface p-4 text-left text-small">
        <div className="flex justify-between">
          <span className="text-text-muted">Original Booking:</span>
          <span className="text-text line-through">{bookingNumber} (TRANSFERRED)</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Successor Booking:</span>
          <span className="font-semibold text-success">{result.successorBookingId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">New Buyer:</span>
          <span className="text-text">{transfereeName}</span>
        </div>
      </div>
    </div>
  );
}

export function TransferNavButtons({
  step,
  canProceed,
  isSubmitting,
  onBack,
  onCancel,
  onNext,
  onExecute,
}: {
  step: number;
  canProceed: boolean;
  isSubmitting: boolean;
  onBack: () => void;
  onCancel?: () => void;
  onNext: () => void;
  onExecute: () => void;
}) {
  return (
    <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
      {step > 1 ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={onBack}
          leftIcon={<ArrowLeft className="h-4 w-4" />}
        >
          Back
        </Button>
      ) : (
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      )}

      {step < 4 ? (
        <Button
          variant="primary"
          size="sm"
          onClick={onNext}
          disabled={!canProceed}
          rightIcon={<ArrowRight className="h-4 w-4" />}
        >
          Next
        </Button>
      ) : (
        <Button
          variant="primary"
          size="sm"
          onClick={onExecute}
          disabled={isSubmitting}
          isLoading={isSubmitting}
          leftIcon={<RefreshCw className={`h-4 w-4 ${isSubmitting ? 'animate-spin' : ''}`} />}
        >
          Confirm & Execute Transfer
        </Button>
      )}
    </div>
  );
}

export function Step1SelectBooking({
  bookings,
  selectedBookingId,
  onSelect,
}: {
  bookings: BookingOption[];
  selectedBookingId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <label className="block text-caption font-medium text-text-muted">
        Select Original Active Booking
      </label>
      <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
        {bookings.map((b) => (
          <div
            key={b.id}
            onClick={() => onSelect(b.id)}
            className={`cursor-pointer rounded-card border p-3 transition-colors ${
              selectedBookingId === b.id
                ? 'border-focus bg-primary/5 ring-1 ring-focus'
                : 'border-border bg-surface hover:border-border-input'
            }`}
          >
            <div className="flex justify-between text-body font-medium">
              <span className="font-mono text-primary font-semibold">{b.bookingNumber}</span>
              <span className="text-text font-semibold">{b.customerName}</span>
            </div>
            <div className="mt-1 flex justify-between text-caption text-text-muted">
              <span>{b.propertyName}</span>
              <span className="tabular-nums">
                Paid: {formatMoney(BigInt(b.paidAmountPaisa))} /{' '}
                {formatMoney(BigInt(b.totalPricePaisa))}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Step2SelectTransferee({
  customers,
  selectedCustomerId,
  originalCustomerId,
  onSelect,
}: {
  customers: CustomerOption[];
  selectedCustomerId: string;
  originalCustomerId?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <label className="block text-caption font-medium text-text-muted">
        Select Transferee (New Buyer)
      </label>
      <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
        {customers
          .filter((c) => c.id !== originalCustomerId)
          .map((c) => (
            <div
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={`cursor-pointer rounded-card border p-3 transition-colors ${
                selectedCustomerId === c.id
                  ? 'border-focus bg-primary/5 ring-1 ring-focus'
                  : 'border-border bg-surface hover:border-border-input'
              }`}
            >
              <div className="flex justify-between text-body">
                <span className="font-semibold text-text">{c.name}</span>
                <span className="text-caption text-text-muted">{c.phone}</span>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

export function Step3FeeReason({
  fee,
  reason,
  onChangeFee,
  onChangeReason,
}: {
  fee: string;
  reason: string;
  onChangeFee: (v: string) => void;
  onChangeReason: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <FormField id="transfer-fee" label="Transfer Processing Fee (৳)">
        <Input
          id="transfer-fee"
          type="number"
          min="0"
          value={fee}
          onChange={(e) => onChangeFee(e.target.value)}
        />
      </FormField>

      <FormField id="transfer-reason" label="Transfer Reason & Authorization" required>
        <Input
          id="transfer-reason"
          required
          value={reason}
          onChange={(e) => onChangeReason(e.target.value)}
          placeholder="State the legal or administrative rationale..."
        />
      </FormField>
    </div>
  );
}

export function Step4Summary({
  booking,
  transferee,
  fee,
}: {
  booking?: BookingOption;
  transferee?: CustomerOption;
  fee: string;
}) {
  const feePaisa = BigInt(Math.max(0, Math.round(parseFloat(fee || '0') * 100)));
  return (
    <div className="space-y-3 rounded-card border border-border bg-surface-sunken/40 p-4 text-small">
      <div className="flex justify-between border-b border-border pb-2">
        <span className="text-text-muted">Booking:</span>
        <span className="font-mono text-text font-semibold">
          {booking?.bookingNumber} ({booking?.propertyName})
        </span>
      </div>
      <div className="flex justify-between border-b border-border pb-2">
        <span className="text-text-muted">Current Owner:</span>
        <span className="text-text">{booking?.customerName}</span>
      </div>
      <div className="flex justify-between border-b border-border pb-2">
        <span className="text-text-muted">New Owner:</span>
        <span className="font-semibold text-success">{transferee?.name}</span>
      </div>
      <div className="flex justify-between border-b border-border pb-2">
        <span className="text-text-muted">Transfer Fee:</span>
        <span className="font-semibold text-primary tabular-nums">{formatMoney(feePaisa)}</span>
      </div>
      <div className="pt-1 text-caption text-text-muted">
        <strong>Invariant AT-35:</strong> Original booking will be marked as{' '}
        <code className="text-primary font-mono">TRANSFERRED</code>, and successor booking created
        atomically.
      </div>
    </div>
  );
}
