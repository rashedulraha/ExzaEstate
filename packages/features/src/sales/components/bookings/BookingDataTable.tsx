import type { ReactElement } from 'react';
import { DataTable, StatusBadge, Button, type ColumnDef } from '@exzaestate/ui';
import { formatMoney } from '@exzaestate/shared';
import { BookingReservationTimer } from './BookingReservationTimer.js';
import type { BookingItem } from '../../schemas/booking.schema.js';

interface BookingDataTableProps {
  bookings: BookingItem[];
  isLoading: boolean;
  onSelectBooking: (item: BookingItem) => void;
  onGenerateAgreement?: (item: BookingItem) => void;
}

export function BookingDataTable({
  bookings,
  isLoading,
  onSelectBooking,
  onGenerateAgreement,
}: BookingDataTableProps): ReactElement {
  const columns: ColumnDef<BookingItem>[] = [
    {
      key: 'bookingNumber',
      header: 'Booking #',
      render: (row) => (
        <div>
          <button
            type="button"
            className="font-medium text-primary hover:underline text-left"
            onClick={() => onSelectBooking(row)}
          >
            {row.bookingNumber}
          </button>
          <div className="text-caption text-text-muted mt-0.5">Unit: {row.propertyCode ?? '—'}</div>
        </div>
      ),
    },
    {
      key: 'customerName',
      header: 'Allottee',
      render: (row) => (
        <div className="font-medium text-text">
          {row.customerName ?? row.customerId.slice(0, 8)}
        </div>
      ),
    },
    {
      key: 'netPrice',
      header: 'Contract Value',
      isMoney: true,
      render: (row) => (
        <span className="font-semibold text-text">{formatMoney(row.netPricePaisa)}</span>
      ),
    },
    {
      key: 'bookingDeposit',
      header: 'Deposit Paid',
      isMoney: true,
      render: (row) => (
        <span className="text-small font-medium text-text-2">
          {formatMoney(row.bookingAmountPaisa)}
        </span>
      ),
    },
    {
      key: 'reservation',
      header: 'Reservation Window',
      render: (row) => <BookingReservationTimer expiresAt={row.expiresAt} status={row.status} />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge domain="booking" value={row.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Button variant="secondary" size="sm" onClick={() => onSelectBooking(row)}>
            Details
          </Button>
          {(row.status === 'CONFIRMED' || row.status === 'AGREEMENT_PENDING') &&
            onGenerateAgreement && (
              <Button variant="primary" size="sm" onClick={() => onGenerateAgreement(row)}>
                Agreement
              </Button>
            )}
        </div>
      ),
    },
  ];

  return (
    <DataTable<BookingItem>
      data={bookings}
      columns={columns}
      isLoading={isLoading}
      keyExtractor={(item) => item.id}
    />
  );
}
