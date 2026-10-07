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
            <Button
              variant="destructive"
              size="sm"
              className="rounded-button"
              onClick={() => onCancelBooking(booking)}
            >
              Cancel Reservation
            </Button>
          )}
          {(booking.status === 'CONFIRMED' || booking.status === 'AGREEMENT_PENDING') &&
            onGenerateAgreement && (
              <Button
                variant="primary"
                size="sm"
                className="rounded-button"
                onClick={() => onGenerateAgreement(booking)}
              >
                Generate Agreement
              </Button>
            )}
          <Button variant="secondary" size="sm" className="rounded-button" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="p-3.5 rounded-card bg-surface-sunken/40 border border-border flex items-center justify-between">
          <div>
            <div className="text-caption font-semibold uppercase tracking-wider text-text-muted">
              Reservation Status
            </div>
            <div className="mt-1">
              <StatusBadge domain="booking" value={booking.status} />
            </div>
          </div>
          <div>
            <BookingReservationTimer expiresAt={booking.expiresAt} status={booking.status} />
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-caption font-semibold text-text-muted uppercase tracking-wider">
            Allottee & Unit Identification
          </h4>
          <div className="p-3.5 bg-surface-sunken/40 rounded-card border border-border space-y-2">
            <div className="p-2.5 bg-surface rounded-button border border-border flex items-center justify-between text-small">
              <span className="text-text-muted">Target Unit</span>
              <span className="font-mono font-semibold text-text">
                {booking.propertyCode ?? booking.propertyId}
              </span>
            </div>
            <div className="p-2.5 bg-surface rounded-button border border-border flex items-center justify-between text-small">
              <span className="text-text-muted">Allottee</span>
              <span className="font-semibold text-text">
                {booking.customerName ?? booking.customerId}
              </span>
            </div>
            <div className="p-2.5 bg-surface rounded-button border border-border flex items-center justify-between text-small">
              <span className="text-text-muted">Booking Date</span>
              <span className="text-text tabular-nums">
                {formatDate(booking.bookingDate, 'Asia/Dhaka')}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-caption font-semibold text-text-muted uppercase tracking-wider">
            Financial Terms (Double-Entry Aligned)
          </h4>
          <div className="p-3.5 bg-surface-sunken/40 rounded-card border border-border space-y-2">
            <div className="p-2.5 bg-surface rounded-button border border-border flex items-center justify-between text-small">
              <span className="text-text-muted">Base Property Value</span>
              <span className="font-medium text-text tabular-nums">
                {formatMoney(booking.basePricePaisa)}
              </span>
            </div>
            {booking.discountAmountPaisa !== '0' && (
              <div className="p-2.5 bg-surface rounded-button border border-border flex items-center justify-between text-small text-accent">
                <span>Negotiated Discount</span>
                <span className="font-medium tabular-nums">
                  − {formatMoney(booking.discountAmountPaisa)}
                </span>
              </div>
            )}
            <div className="p-2.5 bg-surface rounded-button border border-border flex items-center justify-between text-small">
              <span className="font-semibold text-text">Net Allotment Price</span>
              <span className="font-bold text-primary tabular-nums">
                {formatMoney(booking.netPricePaisa)}
              </span>
            </div>
            <div className="p-2.5 bg-surface rounded-button border border-border flex items-center justify-between text-small">
              <span className="text-text-muted">Earnest Deposit Paid</span>
              <span className="font-medium text-text tabular-nums">
                {formatMoney(booking.bookingAmountPaisa)}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-caption font-semibold text-text-muted uppercase tracking-wider">
            Reservation Timeline
          </h4>
          <div className="p-3.5 bg-surface-sunken/40 rounded-card border border-border space-y-2">
            <div className="p-2.5 bg-surface rounded-button border border-border flex items-center justify-between text-small">
              <div>
                <div className="font-semibold text-text">Reservation Placed</div>
                <div className="text-caption text-text-muted tabular-nums">
                  {formatDate(booking.createdAt, 'Asia/Dhaka')}
                </div>
              </div>
              <span className="text-caption font-medium px-2 py-0.5 rounded-full bg-surface-sunken text-text-2 border border-border">
                HOLD
              </span>
            </div>
            {booking.status === 'CONFIRMED' && (
              <div className="p-2.5 bg-surface rounded-button border border-border flex items-center justify-between text-small">
                <div>
                  <div className="font-semibold text-success">Booking Deposit Confirmed</div>
                  <div className="text-caption text-text-muted">Allotment confirmed and locked</div>
                </div>
                <span className="text-caption font-medium px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20">
                  LOCKED
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Drawer>
  );
}
