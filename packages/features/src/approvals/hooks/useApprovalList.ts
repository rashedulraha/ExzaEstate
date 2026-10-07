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
  const discounts = items.filter(
    (i) => (i.type === 'DISCOUNT' || i.type === 'PRICE_EXCEPTION') && i.status === 'PENDING',
  ).length;
  const expenses = items.filter((i) => i.type === 'EXPENSE' && i.status === 'PENDING').length;
  const approvedToday = items.filter((i) => i.status === 'APPROVED').length;

  return {
    pendingCount: pending,
    discountCount: discounts,
    expenseCount: expenses,
    approvedCount: approvedToday,
  };
}

function parseString(val: unknown, fallback: string): string {
  return typeof val === 'string' && val.length > 0 ? val : fallback;
}

function parseNumber(val: unknown, fallback: number): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const num = Number(val);
    if (!Number.isNaN(num)) return num;
  }
  return fallback;
}

function parseNullableString(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  return String(val);
}

function parseNullableNumber(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  const num = Number(val);
  return Number.isNaN(num) ? null : num;
}

function resolveEntityId(r: Record<string, unknown>): string {
  if (typeof r.entityId === 'string' && r.entityId.length > 0) return r.entityId;
  if (typeof r.approvalNumber === 'string' && r.approvalNumber.length > 0) return r.approvalNumber;
  if (typeof r.id === 'string') return r.id;
  return '';
}

function resolveReason(r: Record<string, unknown>): string | null {
  if (typeof r.reason === 'string') return r.reason;
  if (typeof r.description === 'string') return r.description;
  if (typeof r.rejectionReason === 'string') return r.rejectionReason;
  return null;
}

function mapToApprovalItem(raw: unknown): ApprovalItem {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const status = (r.status as ApprovalStatusEnum) || 'PENDING';

  return {
    id: parseString(r.id, ''),
    type: parseString(r.type, 'OTHER'),
    entityType: parseString(r.entityType, 'Approval'),
    entityId: resolveEntityId(r),
    title: parseString(r.title, 'Approval Request'),
    requesterId: parseString(r.requesterId, ''),
    requesterName: typeof r.requesterName === 'string' ? r.requesterName : undefined,
    amountPaisa: parseNullableString(r.amountPaisa),
    percentage: parseNullableNumber(r.percentage),
    status,
    currentTier: parseNumber(r.currentTier ?? r.currentStepOrder, 1),
    maxTier: parseNumber(r.maxTier ?? r.totalSteps, 1),
    reason: resolveReason(r),
    createdAt: parseString(r.createdAt, new Date().toISOString()),
    updatedAt: parseString(r.updatedAt, new Date().toISOString()),
  };
}

function extractRawList(rawData: unknown): unknown[] {
  if (Array.isArray(rawData)) {
    return rawData;
  }
  if (!rawData || typeof rawData !== 'object') {
    return [];
  }
  const record = rawData as Record<string, unknown>;
  if (Array.isArray(record.items)) {
    return record.items;
  }
  if (record.data && typeof record.data === 'object') {
    const nested = record.data as Record<string, unknown>;
    if (Array.isArray(nested.items)) return nested.items;
    if (Array.isArray(nested)) return nested as unknown[];
  }
  return [];
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

  const items: ApprovalItem[] = useMemo(() => {
    return extractRawList(rawData).map(mapToApprovalItem);
  }, [rawData]);

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
