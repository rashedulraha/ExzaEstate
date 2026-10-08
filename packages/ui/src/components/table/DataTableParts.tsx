import React from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import type { TableDensity, ColumnDef } from './table.types.js';

export const densityClasses: Record<TableDensity, { cell: string; height: string }> = {
  dense: { cell: 'py-1 px-3 text-small', height: 'h-8' },
  compact: { cell: 'py-2 px-4 text-body', height: 'h-10' },
  comfortable: { cell: 'py-3 px-4 text-body', height: 'h-12' },
};

export function resolveAlignClass(align?: 'left' | 'center' | 'right', isMoney?: boolean): string {
  if (align === 'right' || isMoney) return 'text-right';
  if (align === 'center') return 'text-center';
  return 'text-left';
}

function resolveJustifyClass(align?: 'left' | 'center' | 'right', isMoney?: boolean): string {
  if (align === 'right' || isMoney) return 'justify-end';
  if (align === 'center') return 'justify-center';
  return 'justify-start';
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

export function renderCellValue<T>(col: ColumnDef<T>, row: T): React.ReactNode {
  if (col.render) {
    return col.render(row);
  }
  const rawValue = (row as Record<string, unknown>)[col.key];
  if (rawValue !== undefined && rawValue !== null) {
    return String(rawValue);
  }
  return '—';
}

export interface TableHeadProps<T> {
  columns: ColumnDef<T>[];
  hasSelection: boolean;
  isAllSelected: boolean;
  onSelectAll?: () => void;
  sortKey: string | null;
  sortOrder: 'asc' | 'desc';
  onSort: (key: string) => void;
}

export function DataTableHead<T>({
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
          const justifyClass = resolveJustifyClass(col.align, col.isMoney);
          const widthStyle = col.width ? { width: col.width } : undefined;

          return (
            <th
              key={col.key}
              scope="col"
              style={widthStyle}
              onClick={() => col.sortable && onSort(col.key)}
              className={`py-2 px-4 text-small font-semibold text-text-muted select-none ${alignClass} ${
                col.sortable ? 'cursor-pointer hover:text-text' : ''
              }`}
            >
              <div className={`flex items-center gap-1.5 ${justifyClass}`}>
                <span>{col.header}</span>
                {col.sortable && renderSortIcon(isSorted, sortOrder)}
              </div>
            </th>
          );
        })}
      </tr>
    </thead>
  );
}

export interface TableBodyProps<T> {
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

export function DataTableBody<T>({
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
