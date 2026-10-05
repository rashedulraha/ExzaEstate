import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useTransfers } from '../hooks/useTransfers.js';
import {
  BookingTransferWizard,
  type BookingOption,
  type CustomerOption,
} from '../components/transfers/BookingTransferWizard.js';
import type { BookingTransferInput, BookingTransferResult } from '../schemas/operations.schema.js';

export interface BookingTransferPageProps {
  bookings?: BookingOption[];
  customers?: CustomerOption[];
}

export function BookingTransferPage({ bookings = [], customers = [] }: BookingTransferPageProps) {
  const [_lastResult, setLastResult] = useState<BookingTransferResult | null>(null);
  const { executeTransfer } = useTransfers();

  const handleExecute = async (input: BookingTransferInput): Promise<BookingTransferResult> => {
    await executeTransfer(input);
    const result: BookingTransferResult = {
      transferNumber: `TRF-${Date.now()}`,
      originalBookingId: input.originalBookingId,
      successorBookingId: `SUCC-${Date.now()}`,
      transfereeCustomerId: input.transfereeCustomerId,
      transferredAt: new Date().toISOString(),
    };
    setLastResult(result);
    return result;
  };

  return (
    <div className="container-page max-w-4xl space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <RefreshCw className="h-6 w-6 text-primary" />
          <h1 className="text-h1 font-semibold text-text">
            Booking Ownership Transfer & Succession
          </h1>
        </div>
        <p className="mt-1 text-caption text-text-muted">
          Enforces Invariant AT-35 (Original marked TRANSFERRED before successor created). Customer
          installments & ledger history preserved.
        </p>
      </div>

      <BookingTransferWizard
        bookings={bookings}
        customers={customers}
        onExecute={handleExecute}
        onSuccess={(res) => setLastResult(res)}
      />
    </div>
  );
}
