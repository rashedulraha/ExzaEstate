import { useState, useMemo } from 'react';
import { usePaymentControllerListPayments } from '@exzaestate/api-client';
import type { PaymentItem, PaymentFilters, PaymentKpis } from '../schemas/collection.schema.js';

export function computePaymentKpis(items: PaymentItem[]): PaymentKpis {
  let totalCollected = 0n;
  let totalDraft = 0n;
  let countPosted = 0;
  let countDraft = 0;
  let countReversed = 0;
  let countChequePending = 0;

  for (const item of items) {
    const amount = BigInt(item.amountPaisa || '0');

    if (item.status === 'POSTED') {
      totalCollected += amount;
      countPosted += 1;
    } else if (item.status === 'DRAFT') {
      totalDraft += amount;
      countDraft += 1;
    } else if (item.status === 'REVERSED') {
      countReversed += 1;
    }

    if (item.paymentMethod === 'CHEQUE' && item.chequeStatus === 'PENDING') {
      countChequePending += 1;
    }
  }

  return {
    totalCollectedPaisa: totalCollected.toString(),
    totalDraftPaisa: totalDraft.toString(),
    countPosted,
    countDraft,
    countReversed,
    countChequePending,
    totalRecords: items.length,
  };
}

function parsePaymentItems(rawData: unknown): PaymentItem[] {
  if (Array.isArray(rawData)) {
    return rawData as PaymentItem[];
  }
  if (rawData && typeof rawData === 'object' && 'items' in rawData) {
    const nested = (rawData as Record<string, unknown>).items;
    if (Array.isArray(nested)) {
      return nested as PaymentItem[];
    }
  }
  if (rawData && typeof rawData === 'object' && 'data' in rawData) {
    const nested = (rawData as Record<string, unknown>).data;
    if (Array.isArray(nested)) {
      return nested as PaymentItem[];
    }
  }
  return [];
}

export function usePaymentList() {
  const [filters, setFilters] = useState<PaymentFilters>({
    status: 'ALL',
    paymentMethod: 'ALL',
    search: '',
    page: 1,
  });

  const query = usePaymentControllerListPayments();
  const allItems = useMemo(() => parsePaymentItems(query.data), [query.data]);
  const kpis = useMemo(() => computePaymentKpis(allItems), [allItems]);

  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      if (filters.status !== 'ALL' && item.status !== filters.status) return false;
      if (filters.paymentMethod !== 'ALL' && item.paymentMethod !== filters.paymentMethod)
        return false;
      if (filters.search && filters.search.trim()) {
        const q = filters.search.toLowerCase();
        const matchesName = item.customerName.toLowerCase().includes(q);
        const matchesCode = (item.receiptNumber || item.bookingCode || '')
          .toLowerCase()
          .includes(q);
        return matchesName || matchesCode;
      }
      return true;
    });
  }, [allItems, filters]);

  return {
    payments: filteredItems,
    allPayments: allItems,
    kpis,
    filters,
    setFilters,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
