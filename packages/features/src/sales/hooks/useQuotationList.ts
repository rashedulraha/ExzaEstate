import { useState, useMemo } from 'react';
import { useQuotationControllerGetQuotations } from '@exzaestate/api-client';
import type { QuotationItem, QuotationStatusEnum } from '../schemas/quotation.schema.js';

export interface QuotationFilters {
  status: QuotationStatusEnum | 'ALL';
  search: string;
  page: number;
}

export function computeQuotationKpis(items: QuotationItem[]) {
  const total = items.length;
  const pending = items.filter((q) => q.status === 'PENDING_APPROVAL').length;
  const accepted = items.filter((q) => q.status === 'ACCEPTED').length;
  const converted = items.filter((q) => q.status === 'CONVERTED').length;

  return {
    totalCount: total,
    pendingApprovalCount: pending,
    acceptedCount: accepted,
    convertedCount: converted,
  };
}

function parseQuotationItems(rawData: unknown): QuotationItem[] {
  if (Array.isArray(rawData)) {
    return rawData as QuotationItem[];
  }
  if (rawData && typeof rawData === 'object' && 'data' in rawData) {
    const nested = (rawData as Record<string, unknown>).data;
    if (Array.isArray(nested)) {
      return nested as QuotationItem[];
    }
  }
  return [];
}

export function useQuotationList() {
  const [filters, setFilters] = useState<QuotationFilters>({
    status: 'ALL',
    search: '',
    page: 1,
  });

  const queryParams = useMemo(() => {
    return {
      status: filters.status === 'ALL' ? undefined : (filters.status as unknown as undefined),
      search: filters.search.trim() || undefined,
      page: filters.page,
    };
  }, [filters]);

  const query = useQuotationControllerGetQuotations(queryParams);
  const items = useMemo(() => parseQuotationItems(query.data), [query.data]);
  const kpis = useMemo(() => computeQuotationKpis(items), [items]);

  return {
    quotations: items,
    kpis,
    filters,
    setFilters,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
