import { type ReactElement, useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router';
import {
  Breadcrumbs,
  Button,
  Input,
  Select,
  LoadingState,
  ErrorState,
  EmptyState,
  StickyToolbar,
} from '@exzaestate/ui';
import { PermissionGate } from '@exzaestate/app-core';
import { PERMISSIONS } from '@exzaestate/shared';
import { Plus, Search, X } from 'lucide-react';
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
  onOpenWizard: () => void;
  isEmbedded?: boolean;
}

function renderBookingTableContent({
  isLoading,
  isError,
  error,
  bookings,
  onRetry,
  onSelect,
  onOpenWizard,
  isEmbedded = false,
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
      <div className="p-6">
        <EmptyState
          dashedBorder
          title="No bookings recorded"
          description="Start by launching the 7-step booking wizard to reserve a property unit."
          actionLabel="New Booking Wizard"
          actionVariant="secondary"
          actionIcon={<Plus className="w-4 h-4" />}
          onAction={onOpenWizard}
        />
      </div>
    );
  }
  if (isEmbedded) {
    return (
      <BookingDataTable
        bookings={bookings}
        isLoading={isLoading}
        onSelectBooking={onSelect}
        embedded
        className="border-none shadow-none"
      />
    );
  }
  return (
    <div className="bg-surface rounded-card border border-border overflow-hidden">
      <BookingDataTable bookings={bookings} isLoading={isLoading} onSelectBooking={onSelect} />
    </div>
  );
}

export function BookingListPage(): ReactElement {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const { bookings, kpis, filters, setFilters, isLoading, isError, error, refetch } =
    useBookingList();
  const { createBooking, cancelBooking } = useBookingActions();

  const isNewRequested =
    searchParams.get('new') === 'true' ||
    searchParams.get('action') === 'new' ||
    Boolean((location.state as { openWizard?: boolean } | null)?.openWizard);

  const [isWizardOpen, setIsWizardOpen] = useState(isNewRequested);
  const [selectedBooking, setSelectedBooking] = useState<BookingItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (
      searchParams.get('new') === 'true' ||
      searchParams.get('action') === 'new' ||
      Boolean((location.state as { openWizard?: boolean } | null)?.openWizard)
    ) {
      setIsWizardOpen(true);
    }
  }, [searchParams, location.state]);

  const handleCloseWizard = () => {
    setIsWizardOpen(false);
    if (searchParams.get('new') || searchParams.get('action')) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('new');
          next.delete('action');
          return next;
        },
        { replace: true },
      );
    }
  };

  const hasActiveFilters = Boolean(filters.search || (filters.status && filters.status !== 'ALL'));

  return (
    <div className="container-page space-y-6">
      {/* Tier 1: Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Breadcrumbs
            items={[
              { label: 'Overview', href: '/dashboard', onClick: () => navigate('/dashboard') },
              { label: 'CRM & Sales', href: '/crm/leads', onClick: () => navigate('/crm/leads') },
              { label: 'Bookings & Sales' },
            ]}
          />
          <div className="flex items-center gap-3 mt-1.5">
            <h1 className="text-h1 font-semibold text-text">Bookings & Sales</h1>
            <span className="text-caption font-semibold px-2.5 py-0.5 rounded-full bg-surface-sunken text-text-2 border border-border">
              {kpis.totalCount} Bookings
            </span>
          </div>
        </div>

        <PermissionGate permission={PERMISSIONS.BOOKING_CREATE} fallback={null}>
          <Button variant="primary" className="gap-2" onClick={() => setIsWizardOpen(true)}>
            <Plus className="w-4 h-4" />
            <span>New Booking</span>
          </Button>
        </PermissionGate>
      </div>

      {/* Tier 2: KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card-stat">
          <span className="text-caption font-semibold uppercase tracking-wider text-text-muted block">
            Total Bookings
          </span>
          <span className="text-hero-num font-bold text-text mt-1.5 block">{kpis.totalCount}</span>
        </div>
        <div className="card-stat">
          <span className="text-caption font-semibold uppercase tracking-wider text-text-muted block">
            Reserved Units (Hold)
          </span>
          <span className="text-hero-num font-bold text-warning mt-1.5 block">
            {kpis.requestedCount}
          </span>
        </div>
        <div className="card-stat">
          <span className="text-caption font-semibold uppercase tracking-wider text-text-muted block">
            Awaiting Verification
          </span>
          <span className="text-hero-num font-bold text-accent mt-1.5 block">
            {kpis.pendingApprovalCount}
          </span>
        </div>
        <div className="card-stat">
          <span className="text-caption font-semibold uppercase tracking-wider text-text-muted block">
            Confirmed Bookings
          </span>
          <span className="text-hero-num font-bold text-success mt-1.5 block">
            {kpis.confirmedCount}
          </span>
        </div>
      </div>

      {/* Tier 3: Main Bookings Workspace */}
      <div className="rounded-card border border-border bg-surface shadow-xs">
        <StickyToolbar className="p-2.5 sm:p-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              <Input
                id="booking-search"
                inputSize="md"
                placeholder="Search bookings by booking number, customer name, or unit..."
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                className="pl-9 text-small"
              />
            </div>
            <div className="w-44 sm:w-52">
              <Select
                id="booking-status-filter"
                inputSize="md"
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
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() =>
                  setFilters((prev) => ({ ...prev, search: '', status: 'ALL', page: 1 }))
                }
                className="flex items-center gap-1 px-2.5 py-1.5 text-small text-text-muted hover:text-text rounded-button hover:bg-surface-sunken transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </StickyToolbar>

        {renderBookingTableContent({
          isLoading,
          isError,
          error,
          bookings,
          onRetry: () => void refetch(),
          onSelect: (b) => setSelectedBooking(b),
          onOpenWizard: () => setIsWizardOpen(true),
          isEmbedded: true,
        })}
      </div>

      <BookingWizardModal
        isOpen={isWizardOpen}
        onClose={handleCloseWizard}
        initialPropertyId={searchParams.get('propertyId') ?? undefined}
        initialCustomerId={searchParams.get('customerId') ?? undefined}
        onSubmit={async (data) => {
          setIsSubmitting(true);
          try {
            await createBooking(data);
            handleCloseWizard();
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
