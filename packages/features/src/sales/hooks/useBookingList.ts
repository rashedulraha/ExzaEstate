import { useState, useMemo } from 'react';
import { useBookingControllerListBookings } from '@exzaestate/api-client';
import type { BookingItem, BookingStatusEnum } from '../schemas/booking.schema.js';

export interface BookingFilters {
  status: BookingStatusEnum | 'ALL';
  search: string;
  page: number;
}

export function computeBookingKpis(items: BookingItem[]) {
  const total = items.length;
  const requested = items.filter((b) => b.status === 'REQUESTED').length;
  const pendingApproval = items.filter((b) => b.status === 'PENDING_APPROVAL').length;
  const confirmed = items.filter((b) => b.status === 'CONFIRMED').length;

  return {
    totalCount: total,
    requestedCount: requested,
    pendingApprovalCount: pendingApproval,
    confirmedCount: confirmed,
  };
}

function parseBookingItems(rawData: unknown): BookingItem[] {
  if (Array.isArray(rawData)) {
    return rawData as BookingItem[];
  }
  if (rawData && typeof rawData === 'object' && 'data' in rawData) {
    const nested = (rawData as Record<string, unknown>).data;
    if (Array.isArray(nested)) {
      return nested as BookingItem[];
    }
  }
  return [];
}

export function useBookingList() {
  const [filters, setFilters] = useState<BookingFilters>({
    status: 'ALL',
    search: '',
    page: 1,
  });

  const query = useBookingControllerListBookings();
  const allItems = useMemo(() => parseBookingItems(query.data), [query.data]);

  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      if (filters.status !== 'ALL' && item.status !== filters.status) {
        return false;
      }
      if (filters.search.trim()) {
        const query = filters.search.toLowerCase();
        const matchesNumber = item.bookingNumber?.toLowerCase().includes(query);
        const matchesCustomer = item.customerName?.toLowerCase().includes(query);
        const matchesProperty = item.propertyCode?.toLowerCase().includes(query);
        if (!matchesNumber && !matchesCustomer && !matchesProperty) {
          return false;
        }
      }
      return true;
    });
  }, [allItems, filters]);

  const kpis = useMemo(() => computeBookingKpis(allItems), [allItems]);

  return {
    bookings: filteredItems,
    allBookings: allItems,
    kpis,
    filters,
    setFilters,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
