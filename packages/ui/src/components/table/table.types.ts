import type { ReactNode } from 'react';

export type TableDensity = 'compact' | 'comfortable' | 'dense';
export type TableVariant = 'table' | 'cards' | 'auto';

export interface ColumnDef<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  align?: 'left' | 'center' | 'right';
  isMoney?: boolean;
  sortable?: boolean;
  width?: string;
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  density?: TableDensity;
  variant?: TableVariant;
  isLoading?: boolean;
  emptyState?: ReactNode;
  onRowClick?: (row: T) => void;
  selectedIds?: Set<string>;
  onSelectRow?: (id: string) => void;
  onSelectAll?: () => void;
  totalsRow?: ReactNode;
  className?: string;
}
