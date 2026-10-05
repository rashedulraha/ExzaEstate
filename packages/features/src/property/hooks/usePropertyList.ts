import { useMemo } from 'react';
import {
  usePropertyControllerListProperties,
  type PropertyControllerListPropertiesParams,
} from '@exzaestate/api-client';

export interface PropertyHierarchyBlock {
  id: string;
  code: string;
  name: string;
}

export interface PropertyHierarchyFloor {
  id: string;
  code: string;
  name: string;
  floorNumber: number | null;
}

export interface PropertyItem {
  id: string;
  companyId: string;
  projectId: string;
  blockId: string | null;
  floorId: string | null;
  code: string;
  title: string | null;
  type: string;
  status: string;
  areaSqft: string;
  facing: string | null;
  basePricePaisa: string;
  premiumPaisa: string;
  discountLimitPct: string;
  netPricePaisa: string;
  ownerType: string;
  holdExpiresAt: string | null;
  blockReason: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  block?: PropertyHierarchyBlock | null;
  floor?: PropertyHierarchyFloor | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedPropertyList {
  items: PropertyItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PropertyKpiSummary {
  totalUnits: number;
  availableCount: number;
  reservedCount: number;
  soldCount: number;
  blockedCount: number;
}

export interface UsePropertyListOptions {
  params?: PropertyControllerListPropertiesParams;
  enabled?: boolean;
}

function computePropertyKpis(properties: PropertyItem[], totalUnits?: number): PropertyKpiSummary {
  let available = 0;
  let reserved = 0;
  let sold = 0;
  let blocked = 0;

  for (const p of properties) {
    const s = p.status.toUpperCase();
    switch (s) {
      case 'AVAILABLE':
        available++;
        break;
      case 'RESERVED':
      case 'BOOKED':
        reserved++;
        break;
      case 'SOLD':
        sold++;
        break;
      case 'HOLD':
      case 'BLOCKED':
        blocked++;
        break;
      default:
        break;
    }
  }

  return {
    totalUnits: totalUnits ?? properties.length,
    availableCount: available,
    reservedCount: reserved,
    soldCount: sold,
    blockedCount: blocked,
  };
}

function extractPagination(
  data: PaginatedPropertyList | undefined,
  properties: PropertyItem[],
  params?: PropertyControllerListPropertiesParams,
) {
  if (data) {
    return {
      total: data.total,
      page: data.page,
      limit: data.limit,
      totalPages: data.totalPages,
    };
  }
  return {
    total: properties.length,
    page: params && params.page ? params.page : 1,
    limit: params && params.limit ? params.limit : 20,
    totalPages: 1,
  };
}

export function usePropertyList(options?: UsePropertyListOptions) {
  const params = options?.params;
  const enabled = options ? options.enabled !== false : true;

  const query = usePropertyControllerListProperties<PaginatedPropertyList>(params, {
    query: {
      enabled,
      staleTime: 30_000,
    },
  });

  const paginatedData = query.data as unknown as PaginatedPropertyList | undefined;
  const properties = useMemo(() => (paginatedData ? paginatedData.items : []), [paginatedData]);

  const kpis = useMemo(
    () => computePropertyKpis(properties, paginatedData ? paginatedData.total : undefined),
    [properties, paginatedData],
  );

  const pagination = extractPagination(paginatedData, properties, params);

  return {
    properties,
    total: pagination.total,
    page: pagination.page,
    limit: pagination.limit,
    totalPages: pagination.totalPages,
    kpis,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
