import { type ReactElement, useState } from 'react';
import { Button, Input, Select, LoadingState, ErrorState, EmptyState } from '@exzaestate/ui';
import { PermissionGate } from '@exzaestate/app-core';
import { PERMISSIONS } from '@exzaestate/shared';
import { useBookingList } from '../hooks/useBookingList.js';
import { useBookingActions } from '../hooks/useBookingActions.js';
import { BookingDataTable } from '../components/bookings/BookingDataTable.js';
import { BookingDrawer } from '../components/bookings/BookingDrawer.js';
import { BookingWizardModal } from '../components/bookings/BookingWizard/BookingWizardModal.js';
import type { BookingItem, BookingStatusEnum } from '../schemas/booking.schema.js';

interface RenderBookingTableProps {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  bookings: BookingItem[];
  onRetry: () => void;
  onSelect: (b: BookingItem) => void;
}

function renderBookingTableContent({
  isLoading,
  isError,
  error,
  bookings,
  onRetry,
  onSelect,
}: RenderBookingTableProps): ReactElement {
  if (isLoading) {
    return <LoadingState variant="table" />;
  }
  if (isError) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : 'Failed to load bookings'}
        onRetry={onRetry}
      />
    );
  }
  if (bookings.length === 0) {
    return (
      <EmptyState
        title="No bookings recorded"
        description="Start by launching the 7-step booking wizard to reserve a property unit."
      />
    );
  }
  return <BookingDataTable bookings={bookings} isLoading={isLoading} onSelectBooking={onSelect} />;
}

export function BookingListPage(): ReactElement {
  const { bookings, kpis, filters, setFilters, isLoading, isError, error, refetch } =
    useBookingList();
  const { createBooking, cancelBooking } = useBookingActions();

  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <div className="container-page">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 font-bold text-text">Bookings & Allotments</h1>
          <p className="text-small text-text-muted mt-1">
            Atomic property reservations, co-buyer allocations, and 72-hour hold management
          </p>
        </div>
        <PermissionGate permission={PERMISSIONS.BOOKING_CREATE}>
          <Button variant="primary" onClick={() => setIsWizardOpen(true)}>
            + New Booking Wizard
          </Button>
        </PermissionGate>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-stat">
          <div className="text-small font-medium text-text-muted">Total Allotments</div>
          <div className="text-hero-num font-bold text-text mt-1">{kpis.totalCount}</div>
        </div>
        <div className="card-stat">
          <div className="text-small font-medium text-text-muted">72h Hold Reservations</div>
          <div className="text-hero-num font-bold text-warning mt-1">{kpis.requestedCount}</div>
        </div>
        <div className="card-stat">
          <div className="text-small font-medium text-text-muted">Pending Verification</div>
          <div className="text-hero-num font-bold text-accent mt-1">
            {kpis.pendingApprovalCount}
          </div>
        </div>
        <div className="card-stat">
          <div className="text-small font-medium text-text-muted">Confirmed Allotments</div>
          <div className="text-hero-num font-bold text-success mt-1">{kpis.confirmedCount}</div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1">
          <Input
            id="booking-search"
            placeholder="Search bookings by booking #, allottee name, or unit..."
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            id="booking-status-filter"
            value={filters.status}
            onChange={(val) =>
              setFilters((prev) => ({ ...prev, status: val as BookingStatusEnum | 'ALL' }))
            }
            options={[
              { value: 'ALL', label: 'All Statuses' },
              { value: 'REQUESTED', label: 'Requested (Hold)' },
              { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
              { value: 'CONFIRMED', label: 'Confirmed' },
              { value: 'AGREEMENT_PENDING', label: 'Agreement Pending' },
              { value: 'AGREEMENT_COMPLETED', label: 'Agreement Completed' },
              { value: 'CANCELLED', label: 'Cancelled' },
            ]}
          />
        </div>
      </div>

      {renderBookingTableContent({
        isLoading,
        isError,
        error,
        bookings,
        onRetry: () => void refetch(),
        onSelect: (b) => setSelectedBooking(b),
      })}

      <BookingWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSubmit={async (data) => {
          setIsSubmitting(true);
          try {
            await createBooking(data);
          } finally {
            setIsSubmitting(false);
          }
        }}
        isLoading={isSubmitting}
      />

      <BookingDrawer
        isOpen={Boolean(selectedBooking)}
        onClose={() => setSelectedBooking(null)}
        booking={selectedBooking}
        onCancelBooking={(b) => {
          void cancelBooking(b.id, 'Customer requested reservation release');
          setSelectedBooking(null);
        }}
      />
    </div>
  );
}
