import type { DataScope } from '@exzaestate/shared';

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

export interface SearchResultItem {
  id: string;
  entityType: SearchEntityType;
  title: string;
  subtitle?: string;
  referenceNumber?: string;
  status?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

export interface UserSearchScopeContext {
  userId: string;
  permissions: string[];
  scopes: Record<string, DataScope>;
  teamUserIds?: string[];
  branchIds?: string[];
}

export interface GlobalSearchResponseDto {
  query: string;
  totalResults: number;
  resultsByEntity: Record<SearchEntityType, SearchResultItem[]>;
  items: SearchResultItem[];
}
