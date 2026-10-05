import { useState, useMemo } from 'react';
import { useAgreementControllerListAgreements } from '@exzaestate/api-client';
import type { AgreementItem, AgreementStatusEnum } from '../schemas/agreement.schema.js';

export interface AgreementFilters {
  status: AgreementStatusEnum | 'ALL';
  search: string;
  page: number;
}

export function computeAgreementKpis(items: AgreementItem[]) {
  const total = items.length;
  const pending = items.filter((a) => a.status === 'AGREEMENT_PENDING').length;
  const completed = items.filter((a) => a.status === 'AGREEMENT_COMPLETED').length;

  return {
    totalCount: total,
    pendingSignatureCount: pending,
    signedAndLockedCount: completed,
  };
}

function parseAgreementItems(rawData: unknown): AgreementItem[] {
  if (Array.isArray(rawData)) {
    return rawData as AgreementItem[];
  }
  if (rawData && typeof rawData === 'object' && 'data' in rawData) {
    const nested = (rawData as Record<string, unknown>).data;
    if (Array.isArray(nested)) {
      return nested as AgreementItem[];
    }
  }
  return [];
}

export function useAgreementList() {
  const [filters, setFilters] = useState<AgreementFilters>({
    status: 'ALL',
    search: '',
    page: 1,
  });

  const queryParams = useMemo(() => {
    return {
      status: filters.status === 'ALL' ? undefined : filters.status,
      search: filters.search.trim() || undefined,
      page: filters.page,
    };
  }, [filters]);

  const query = useAgreementControllerListAgreements(queryParams);
  const items = useMemo(() => parseAgreementItems(query.data), [query.data]);
  const kpis = useMemo(() => computeAgreementKpis(items), [items]);

  return {
    agreements: items,
    kpis,
    filters,
    setFilters,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
