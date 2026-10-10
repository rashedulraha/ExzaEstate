import React, { useState } from 'react';
import { DataTableSkeleton } from '../skeleton/Skeleton.js';
import { useIsMobile } from '../../layout/useIsMobile.js';
import { DataTableCards } from './DataTableCards.js';
import { DataTableHead, DataTableBody } from './DataTableParts.js';
import type { TableDensity, ColumnDef, DataTableProps } from './table.types.js';

export * from './table.types.js';

function useDataTableSort() {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else {
        setSortKey(null);
        setSortOrder('asc');
      }
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  return { sortKey, sortOrder, handleSort };
}

interface DataTableDesktopProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  density: TableDensity;
  hasSelection: boolean;
  isAllSelected: boolean;
  selectedIds?: Set<string>;
  onSelectRow?: (id: string) => void;
  onSelectAll?: () => void;
  onRowClick?: (row: T) => void;
  emptyState?: React.ReactNode;
  totalsRow?: React.ReactNode;
  className?: string;
  embedded?: boolean;
  sortKey: string | null;
  sortOrder: 'asc' | 'desc';
  onSort: (key: string) => void;
}

function DataTableDesktop<T>({
  columns,
  data,
  keyExtractor,
  density,
  hasSelection,
  isAllSelected,
  selectedIds,
  onSelectRow,
  onSelectAll,
  onRowClick,
  emptyState,
  totalsRow,
  className,
  embedded,
  sortKey,
  sortOrder,
  onSort,
}: DataTableDesktopProps<T>) {
  const isPlain = embedded || className?.includes('border-none') || className?.includes('border-0');
  const containerClasses = isPlain
    ? `w-full ${className ?? ''}`
    : `w-full card-workspace border border-border bg-surface ${className ?? ''}`;

  return (
    <div className={containerClasses}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse" role="table">
          <DataTableHead
            columns={columns}
            hasSelection={hasSelection}
            isAllSelected={isAllSelected}
            onSelectAll={onSelectAll}
            sortKey={sortKey}
            sortOrder={sortOrder}
            onSort={onSort}
          />
          <DataTableBody
            columns={columns}
            data={data}
            keyExtractor={keyExtractor}
            density={density}
            hasSelection={hasSelection}
            selectedIds={selectedIds}
            onSelectRow={onSelectRow}
            onRowClick={onRowClick}
            emptyState={emptyState}
          />
          {totalsRow && (
            <tfoot>
              <tr>
                <td
                  colSpan={columns.length + (hasSelection ? 1 : 0)}
                  className="p-0 border-t-2 border-border"
                >
                  <div className="rule-double my-1" />
                  {totalsRow}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

function isAllRowsSelected<T>(
  data: T[],
  selectedIds: Set<string> | undefined,
  keyExtractor: (row: T) => string,
): boolean {
  if (!selectedIds || data.length === 0) return false;
  return data.every((row) => selectedIds.has(keyExtractor(row)));
}

function shouldShowCards(variant: string | undefined, isMobile: boolean): boolean {
  if (variant === 'cards') return true;
  if (variant === 'table') return false;
  return isMobile;
}

export function DataTable<T>(props: DataTableProps<T>) {
  const { sortKey, sortOrder, handleSort } = useDataTableSort();
  const isMobile = useIsMobile(768);

  if (props.isLoading) {
    return <DataTableSkeleton rows={6} cols={props.columns.length} />;
  }

  const hasSelection = Boolean(props.selectedIds && props.onSelectRow);
  const isAllSelected = isAllRowsSelected(props.data, props.selectedIds, props.keyExtractor);

  if (shouldShowCards(props.variant, isMobile)) {
    return (
      <div className={`w-full ${props.className ?? ''}`}>
        <DataTableCards
          columns={props.columns}
          data={props.data}
          keyExtractor={props.keyExtractor}
          hasSelection={hasSelection}
          selectedIds={props.selectedIds}
          onSelectRow={props.onSelectRow}
          onRowClick={props.onRowClick}
          emptyState={props.emptyState}
          totalsRow={props.totalsRow}
        />
      </div>
    );
  }

  return (
    <DataTableDesktop
      columns={props.columns}
      data={props.data}
      keyExtractor={props.keyExtractor}
      density={props.density ?? 'compact'}
      hasSelection={hasSelection}
      isAllSelected={isAllSelected}
      selectedIds={props.selectedIds}
      onSelectRow={props.onSelectRow}
      onSelectAll={props.onSelectAll}
      onRowClick={props.onRowClick}
      emptyState={props.emptyState}
      totalsRow={props.totalsRow}
      className={props.className ?? ''}
      embedded={props.embedded}
      sortKey={sortKey}
      sortOrder={sortOrder}
      onSort={handleSort}
    />
  );
}
