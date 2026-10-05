import type { ReactElement } from 'react';
import { Drawer, Button, StatusBadge } from '@exzaestate/ui';
import { formatMoney, formatDate } from '@exzaestate/shared';
import { BookingReservationTimer } from './BookingReservationTimer.js';
import type { BookingItem } from '../../schemas/booking.schema.js';

interface BookingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  booking: BookingItem | null;
  onCancelBooking: (item: BookingItem) => void;
  onGenerateAgreement?: (item: BookingItem) => void;
}

export function BookingDrawer({
  isOpen,
  onClose,
  booking,
  onCancelBooking,
  onGenerateAgreement,
}: BookingDrawerProps): ReactElement {
  if (!booking) return <></>;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`Booking ${booking.bookingNumber}`}
      subtitle="Allotment status audit & reservation details"
      size="md"
      footer={
        <div className="flex justify-between items-center w-full">
          {booking.status === 'REQUESTED' && (
            <Button variant="destructive" size="sm" onClick={() => onCancelBooking(booking)}>
              Cancel Reservation
            </Button>
          )}
          {(booking.status === 'CONFIRMED' || booking.status === 'AGREEMENT_PENDING') &&
            onGenerateAgreement && (
              <Button variant="primary" size="sm" onClick={() => onGenerateAgreement(booking)}>
                Generate Agreement
              </Button>
            )}
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="p-4 rounded-card bg-surface-sunken border border-border flex items-center justify-between">
          <div>
            <div className="text-caption text-text-muted">Reservation Status</div>
            <div className="mt-1">
              <StatusBadge domain="booking" value={booking.status} />
            </div>
          </div>
          <div>
            <BookingReservationTimer expiresAt={booking.expiresAt} status={booking.status} />
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-h5 font-semibold text-text-muted uppercase tracking-wider">
            Allottee & Unit Identification
          </h4>
          <div className="p-3 border border-border-subtle rounded-card space-y-2 text-small">
            <div className="flex justify-between">
              <span className="text-text-muted">Target Unit:</span>
              <span className="font-semibold text-text">
                {booking.propertyCode ?? booking.propertyId}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Allottee:</span>
              <span className="font-medium text-text">
                {booking.customerName ?? booking.customerId}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Booking Date:</span>
              <span className="text-text-2">{formatDate(booking.bookingDate, 'Asia/Dhaka')}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-h5 font-semibold text-text-muted uppercase tracking-wider">
            Financial Terms (Double-Entry Aligned)
          </h4>
          <div className="p-3 border border-border-subtle rounded-card space-y-2 text-small">
            <div className="flex justify-between">
              <span className="text-text-muted">Base Property Value:</span>
              <span className="font-medium text-text">{formatMoney(booking.basePricePaisa)}</span>
            </div>
            {booking.discountAmountPaisa !== '0' && (
              <div className="flex justify-between text-accent">
                <span>Negotiated Discount:</span>
                <span>− {formatMoney(booking.discountAmountPaisa)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold border-t border-border-subtle pt-2">
              <span className="text-text">Net Allotment Price:</span>
              <span className="text-primary">{formatMoney(booking.netPricePaisa)}</span>
            </div>
            <div className="flex justify-between text-caption text-text-muted pt-1">
              <span>Earnest Deposit Paid:</span>
              <span className="text-text">{formatMoney(booking.bookingAmountPaisa)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-h5 font-semibold text-text-muted uppercase tracking-wider">
            Reservation Timeline
          </h4>
          <div className="border-l-2 border-primary/30 pl-4 py-1 space-y-3 text-caption">
            <div>
              <div className="font-semibold text-text">Reservation Placed</div>
              <div className="text-text-muted">{formatDate(booking.createdAt, 'Asia/Dhaka')}</div>
            </div>
            {booking.status === 'CONFIRMED' && (
              <div>
                <div className="font-semibold text-success">Booking Deposit Confirmed</div>
                <div className="text-text-muted">Allotment confirmed and locked</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Drawer>
  );
}
