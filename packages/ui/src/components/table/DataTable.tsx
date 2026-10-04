import React, { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { DataTableSkeleton } from '../skeleton/Skeleton.js';

export type TableDensity = 'compact' | 'comfortable' | 'dense';

export interface ColumnDef<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
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
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  onRowClick?: (row: T) => void;
  selectedIds?: Set<string>;
  onSelectRow?: (id: string) => void;
  onSelectAll?: () => void;
  totalsRow?: React.ReactNode;
  className?: string;
}

const densityClasses: Record<TableDensity, { cell: string; height: string }> = {
  dense: { cell: 'py-1 px-3 text-small', height: 'h-8' },
  compact: { cell: 'py-2 px-4 text-body', height: 'h-10' },
  comfortable: { cell: 'py-3 px-4 text-body', height: 'h-12' },
};

function resolveAlignClass(align?: 'left' | 'center' | 'right', isMoney?: boolean): string {
  if (align === 'right' || isMoney) return 'text-right';
  if (align === 'center') return 'text-center';
  return 'text-left';
}

function renderSortIcon(isSorted: boolean, sortOrder: 'asc' | 'desc') {
  if (!isSorted) {
    return <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" aria-hidden="true" />;
  }
  if (sortOrder === 'asc') {
    return <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />;
  }
  return <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />;
}

function renderCellValue<T>(col: ColumnDef<T>, row: T): React.ReactNode {
  if (col.render) {
    return col.render(row);
  }
  const rawValue = (row as Record<string, unknown>)[col.key];
  if (rawValue !== undefined && rawValue !== null) {
    return String(rawValue);
  }
  return '—';
}

interface TableHeadProps<T> {
  columns: ColumnDef<T>[];
  hasSelection: boolean;
  isAllSelected: boolean;
  onSelectAll?: () => void;
  sortKey: string | null;
  sortOrder: 'asc' | 'desc';
  onSort: (key: string) => void;
}

function DataTableHead<T>({
  columns,
  hasSelection,
  isAllSelected,
  onSelectAll,
  sortKey,
  sortOrder,
  onSort,
}: TableHeadProps<T>) {
  return (
    <thead className="bg-surface-sunken/40 border-b border-border sticky top-0 z-10">
      <tr>
        {hasSelection && (
          <th className="py-2.5 px-3 w-10 text-center" scope="col">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={onSelectAll}
              aria-label="Select all rows"
              className="w-4 h-4 rounded border-border-input cursor-pointer"
            />
          </th>
        )}
        {columns.map((col) => {
          const isSorted = sortKey === col.key;
          const alignClass = resolveAlignClass(col.align, col.isMoney);

          return (
            <th
              key={col.key}
              scope="col"
              style={{ width: col.width }}
              className={`py-2.5 px-4 text-th ${alignClass} select-none`}
            >
              {col.sortable ? (
                <button
                  type="button"
                  onClick={() => onSort(col.key)}
                  className="inline-flex items-center gap-1 text-th hover:text-text cursor-pointer focus:outline-none"
                >
                  <span>{col.header}</span>
                  {renderSortIcon(isSorted, sortOrder)}
                </button>
              ) : (
                <span>{col.header}</span>
              )}
            </th>
          );
        })}
      </tr>
    </thead>
  );
}

interface TableBodyProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  density: TableDensity;
  hasSelection: boolean;
  selectedIds?: Set<string>;
  onSelectRow?: (id: string) => void;
  onRowClick?: (row: T) => void;
  emptyState?: React.ReactNode;
}

function DataTableBody<T>({
  columns,
  data,
  keyExtractor,
  density,
  hasSelection,
  selectedIds,
  onSelectRow,
  onRowClick,
  emptyState,
}: TableBodyProps<T>) {
  if (data.length === 0) {
    return (
      <tbody className="divide-y divide-border">
        <tr>
          <td
            colSpan={columns.length + (hasSelection ? 1 : 0)}
            className="py-12 text-center text-text-muted"
          >
            {emptyState ?? 'No records available'}
          </td>
        </tr>
      </tbody>
    );
  }

  return (
    <tbody className="divide-y divide-border">
      {data.map((row) => {
        const id = keyExtractor(row);
        const isSelected = selectedIds?.has(id);
        const rowClass = isSelected
          ? 'bg-primary/5 hover:bg-primary/8'
          : 'hover:bg-surface-sunken/40';
        const pointerClass = onRowClick ? 'cursor-pointer' : '';

        return (
          <tr
            key={id}
            onClick={() => onRowClick?.(row)}
            className={`transition-colors duration-75 ${pointerClass} ${rowClass}`}
          >
            {hasSelection && (
              <td className="py-2.5 px-3 w-10 text-center" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onSelectRow?.(id)}
                  aria-label={`Select row ${id}`}
                  className="w-4 h-4 rounded border-border-input cursor-pointer"
                />
              </td>
            )}
            {columns.map((col) => {
              const alignClass = resolveAlignClass(col.align, col.isMoney);
              const moneyFont = col.isMoney ? 'tabular-nums' : '';

              return (
                <td
                  key={col.key}
                  className={`${densityClasses[density].cell} ${alignClass} ${moneyFont} text-text`}
                >
                  {renderCellValue(col, row)}
                </td>
              );
            })}
          </tr>
        );
      })}
    </tbody>
  );
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  density = 'compact',
  isLoading = false,
  emptyState,
  onRowClick,
  selectedIds,
  onSelectRow,
  onSelectAll,
  totalsRow,
  className = '',
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  if (isLoading) {
    return <DataTableSkeleton rows={6} cols={columns.length} />;
  }

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

  const hasSelection = Boolean(selectedIds && onSelectRow);
  const isAllSelected = Boolean(
    data.length > 0 && selectedIds && data.every((row) => selectedIds.has(keyExtractor(row))),
  );

  return (
    <div className={`w-full card-workspace border border-border bg-surface ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse" role="table">
          <DataTableHead
            columns={columns}
            hasSelection={hasSelection}
            isAllSelected={isAllSelected}
            onSelectAll={onSelectAll}
            sortKey={sortKey}
            sortOrder={sortOrder}
            onSort={handleSort}
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
