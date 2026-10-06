import { useState, useEffect } from 'react';
import type { QueryKey } from '@tanstack/react-query';
import { useSearchControllerGlobalSearch } from '@exzaestate/api-client';

export type SearchEntityType =
  | 'CUSTOMER'
  | 'LEAD'
  | 'BOOKING'
  | 'PROPERTY'
  | 'PAYMENT'
  | 'RECEIPT'
  | 'VOUCHER'
  | 'DOCUMENT'
  | 'VENDOR'
  | 'PROJECT';

export interface GlobalSearchResultItem {
  id: string;
  entityType: SearchEntityType;
  title: string;
  subtitle?: string;
  referenceNumber?: string;
  status?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

export interface GlobalSearchResponse {
  query: string;
  totalResults: number;
  resultsByEntity: Record<string, GlobalSearchResultItem[]>;
  items: GlobalSearchResultItem[];
}

export function useGlobalSearch(delayMs: number = 250) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchTerm.trim());
    }, delayMs);

    return () => clearTimeout(handler);
  }, [searchTerm, delayMs]);

  const query = useSearchControllerGlobalSearch<GlobalSearchResponse>({
    query: {
      queryKey: ['/api/v1/search', debouncedQuery] as unknown as QueryKey,
      enabled: debouncedQuery.length >= 2,
    },
    request: {
      params: { q: debouncedQuery, limit: 10 },
    },
  });

  return {
    searchTerm,
    setSearchTerm,
    debouncedQuery,
    results: query.data,
    isLoading: query.isLoading && debouncedQuery.length >= 2,
    isError: query.isError,
  };
}
