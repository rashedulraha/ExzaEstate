import { useState, useMemo } from 'react';
import { useCustomerControllerListCustomers } from '@exzaestate/api-client';

export interface CustomerItem {
  id: string;
  customerCode: string;
  fullName: string;
  phone: string;
  email?: string | null;
  nid?: string | null;
  maskedNid?: string | null;
  kycStatus: string;
  kycVerifiedAt?: string | null;
  occupation?: string | null;
  address?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerFilters {
  search?: string;
  kycStatus?: string;
}

export interface CustomerKpis {
  totalCustomers: number;
  verifiedKyc: number;
  pendingKyc: number;
  unverified: number;
}

export function computeCustomerKpis(customers: CustomerItem[]): CustomerKpis {
  let verifiedKyc = 0;
  let pendingKyc = 0;
  let unverified = 0;

  for (const c of customers) {
    const status = c.kycStatus.toUpperCase();
    if (status === 'VERIFIED') verifiedKyc++;
    else if (status === 'PENDING') pendingKyc++;
    else unverified++;
  }

  return {
    totalCustomers: customers.length,
    verifiedKyc,
    pendingKyc,
    unverified,
  };
}

function buildCustomerQueryParams(
  page: number,
  limit: number,
  filters: CustomerFilters,
): Record<string, string | number> {
  const params: Record<string, string | number> = { page, limit };
  if (filters.search) params.search = filters.search;
  if (filters.kycStatus) params.kycStatus = filters.kycStatus;
  return params;
}

function extractCustomerData(rawData: unknown): {
  customers: CustomerItem[];
  total: number;
  totalPages: number;
} {
  if (!rawData || typeof rawData !== 'object') {
    return { customers: [], total: 0, totalPages: 1 };
  }
  const obj = rawData as Record<string, unknown>;
  const payload =
    obj.data && typeof obj.data === 'object' ? (obj.data as Record<string, unknown>) : obj;
  const customers = Array.isArray(payload.items) ? (payload.items as CustomerItem[]) : [];
  const total = typeof payload.total === 'number' ? payload.total : customers.length;
  const totalPages = typeof payload.totalPages === 'number' ? payload.totalPages : 1;
  return { customers, total, totalPages };
}

export function useCustomerList(initialFilters?: CustomerFilters) {
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(25);
  const [filters, setFilters] = useState<CustomerFilters>(initialFilters ?? {});

  const queryParams = useMemo(
    () => buildCustomerQueryParams(page, limit, filters),
    [page, limit, filters],
  );

  const query = useCustomerControllerListCustomers(queryParams, {
    query: { staleTime: 30_000, refetchOnWindowFocus: false },
  });

  const { customers, total, totalPages } = extractCustomerData(query.data);
  const kpis = useMemo(() => computeCustomerKpis(customers), [customers]);

  return {
    customers,
    total,
    totalPages,
    page,
    limit,
    setPage,
    setLimit,
    filters,
    setFilters,
    kpis,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
