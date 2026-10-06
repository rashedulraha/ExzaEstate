import { useState, useMemo } from 'react';
import { useCrmControllerListLeads } from '@exzaestate/api-client';
import { useAuth } from '@exzaestate/app-core';
import type { LeadStatusEnum, LeadSourceEnum } from '../schemas/crm.schema.js';

export interface LeadItem {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  source: string;
  status: string;
  preferredType?: string | null;
  budgetMinPaisa?: string | null;
  budgetMaxPaisa?: string | null;
  assignedToId?: string | null;
  assignedTo?: { id: string; fullName: string; email: string } | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadFilters {
  search?: string;
  status?: LeadStatusEnum | '';
  source?: LeadSourceEnum | '';
  assignedToId?: string;
}

export interface LeadKpis {
  totalLeads: number;
  newLeads: number;
  inNegotiation: number;
  converted: number;
  lost: number;
}

export function computeLeadKpis(leads: LeadItem[]): LeadKpis {
  let newLeads = 0;
  let inNegotiation = 0;
  let converted = 0;
  let lost = 0;

  for (const lead of leads) {
    const status = lead.status.toUpperCase();
    if (status === 'NEW') newLeads++;
    else if (status === 'NEGOTIATION' || status === 'INTERESTED' || status === 'QUALIFIED')
      inNegotiation++;
    else if (status === 'CUSTOMER' || status === 'BOOKING') converted++;
    else if (status === 'LOST') lost++;
  }

  return {
    totalLeads: leads.length,
    newLeads,
    inNegotiation,
    converted,
    lost,
  };
}

function buildLeadQueryParams(
  page: number,
  limit: number,
  filters: LeadFilters,
): Record<string, string | number> {
  const params: Record<string, string | number> = { page, limit };
  if (filters.search) params.search = filters.search;
  if (filters.status) params.status = filters.status;
  if (filters.source) params.source = filters.source;
  if (filters.assignedToId) params.assignedToId = filters.assignedToId;
  return params;
}

function resolveLeadBudget(item: Record<string, unknown>): {
  min: string | null;
  max: string | null;
} {
  const min = typeof item.budgetMinPaisa === 'string' ? item.budgetMinPaisa : null;
  let max = typeof item.budgetMaxPaisa === 'string' ? item.budgetMaxPaisa : null;
  if (!max && item.budgetPaisa) {
    max = String(item.budgetPaisa);
  }
  return { min, max };
}

function resolveLeadDetails(item: Record<string, unknown>) {
  const name = String(item.fullName || item.name || '');
  const type = (item.preferredType as string) || (item.preferredPropertyType as string) || null;
  const notes = (item.notes as string) || (item.interestNotes as string) || null;
  return { name, type, notes };
}

function mapRawLead(item: Record<string, unknown>): LeadItem {
  const budget = resolveLeadBudget(item);
  const details = resolveLeadDetails(item);

  return {
    id: String(item.id || ''),
    fullName: details.name,
    phone: String(item.phone || ''),
    email: item.email ? String(item.email) : null,
    source: String(item.source || ''),
    status: String(item.status || 'New'),
    preferredType: details.type,
    budgetMinPaisa: budget.min,
    budgetMaxPaisa: budget.max,
    assignedToId: item.assignedToId ? String(item.assignedToId) : null,
    assignedTo: (item.assignedTo as LeadItem['assignedTo']) || null,
    notes: details.notes,
    createdAt: String(item.createdAt || ''),
    updatedAt: String(item.updatedAt || ''),
  };
}

function extractLeadData(rawData: unknown): {
  leads: LeadItem[];
  total: number;
  totalPages: number;
} {
  if (!rawData || typeof rawData !== 'object') {
    return { leads: [], total: 0, totalPages: 1 };
  }
  const obj = rawData as Record<string, unknown>;
  const payload =
    obj.data && typeof obj.data === 'object' ? (obj.data as Record<string, unknown>) : obj;
  const rawItems = Array.isArray(payload.items) ? (payload.items as Record<string, unknown>[]) : [];
  const leads = rawItems.map(mapRawLead);
  const total = typeof payload.total === 'number' ? payload.total : leads.length;
  const totalPages = typeof payload.totalPages === 'number' ? payload.totalPages : 1;
  return { leads, total, totalPages };
}

export function useLeadList(initialFilters?: LeadFilters) {
  const { user } = useAuth();
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(25);
  const [filters, setFilters] = useState<LeadFilters>(initialFilters ?? {});

  const queryParams = useMemo(
    () => buildLeadQueryParams(page, limit, filters),
    [page, limit, filters],
  );

  const query = useCrmControllerListLeads(queryParams, {
    query: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  });

  const { leads, total, totalPages } = extractLeadData(query.data);
  const kpis = useMemo(() => computeLeadKpis(leads), [leads]);

  return {
    leads,
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
    currentUser: user,
  };
}
