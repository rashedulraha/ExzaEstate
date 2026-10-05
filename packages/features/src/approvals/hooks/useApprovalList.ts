import { useState, useMemo } from 'react';
import { useApprovalsControllerGetInbox } from '@exzaestate/api-client';
import type { ApprovalItem, ApprovalStatusEnum } from '../schemas/approval.schema.js';

export interface ApprovalFilters {
  status: ApprovalStatusEnum | 'ALL';
  type: string;
  search: string;
  page: number;
}

export function computeApprovalKpis(items: ApprovalItem[]) {
  const pending = items.filter((i) => i.status === 'PENDING').length;
  const discounts = items.filter((i) => i.type === 'DISCOUNT' && i.status === 'PENDING').length;
  const expenses = items.filter((i) => i.type === 'EXPENSE' && i.status === 'PENDING').length;
  const approvedToday = items.filter((i) => i.status === 'APPROVED').length;

  return {
    pendingCount: pending,
    discountCount: discounts,
    expenseCount: expenses,
    approvedCount: approvedToday,
  };
}

export function useApprovalList() {
  const [filters, setFilters] = useState<ApprovalFilters>({
    status: 'PENDING',
    type: 'ALL',
    search: '',
    page: 1,
  });

  const queryParams = useMemo(() => {
    return {
      status: filters.status === 'ALL' ? undefined : filters.status,
      type: filters.type === 'ALL' ? undefined : filters.type,
      search: filters.search.trim() || undefined,
      page: filters.page,
    };
  }, [filters]);

  const query = useApprovalsControllerGetInbox(queryParams);

  const rawData: unknown = query.data;
  let items: ApprovalItem[] = [];

  if (Array.isArray(rawData)) {
    items = rawData as ApprovalItem[];
  } else if (rawData && typeof rawData === 'object' && 'data' in rawData) {
    const nested = (rawData as Record<string, unknown>).data;
    if (Array.isArray(nested)) {
      items = nested as ApprovalItem[];
    }
  }

  const kpis = useMemo(() => computeApprovalKpis(items), [items]);

  return {
    approvals: items,
    kpis,
    filters,
    setFilters,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
