import React from 'react';
import type { ColumnDef } from './table.types.js';

export interface TableCardsProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  hasSelection: boolean;
  selectedIds?: Set<string>;
  onSelectRow?: (id: string) => void;
  onRowClick?: (row: T) => void;
  emptyState?: React.ReactNode;
  totalsRow?: React.ReactNode;
}

function renderCardCellValue<T>(col: ColumnDef<T>, row: T): React.ReactNode {
  if (col.render) {
    return col.render(row);
  }
  const rawValue = (row as Record<string, unknown>)[col.key];
  if (rawValue !== undefined && rawValue !== null) {
    return String(rawValue);
  }
  return '—';
}

interface CardItemProps<T> {
  row: T;
  columns: ColumnDef<T>[];
  keyExtractor: (row: T) => string;
  hasSelection: boolean;
  isSelected?: boolean;
  onSelectRow?: (id: string) => void;
  onRowClick?: (row: T) => void;
}

function DataTableCardItem<T>({
  row,
  columns,
  keyExtractor,
  hasSelection,
  isSelected,
  onSelectRow,
  onRowClick,
}: CardItemProps<T>) {
  const id = keyExtractor(row);
  const pointerClass = onRowClick ? 'cursor-pointer hover:border-border-strong' : '';
  const selectedBorder = isSelected
    ? 'border-primary ring-1 ring-primary/30 bg-primary/5'
    : 'bg-surface';

  const primaryCol = columns[0];
  const secondaryCol = columns.length > 1 ? columns[1] : undefined;
  const otherCols = columns.slice(2);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onRowClick(row);
    }
  };

  return (
    <div
      onClick={() => onRowClick?.(row)}
      onKeyDown={handleKeyDown}
      tabIndex={onRowClick ? 0 : undefined}
      role={onRowClick ? 'button' : undefined}
      className={`card-mobile ${selectedBorder} ${pointerClass} transition-all duration-150 flex flex-col gap-2.5`}
    >
      {/* Card Header Row: Selection + Primary Title + Secondary / Status */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {hasSelection && (
            <div className="touch-target -ml-1 -my-2 shrink-0" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onSelectRow?.(id)}
                aria-label={`Select row ${id}`}
                className="w-4 h-4 rounded border-border-input cursor-pointer"
              />
            </div>
          )}
          {primaryCol && (
            <div className="font-semibold text-text text-body truncate">
              {renderCardCellValue(primaryCol, row)}
            </div>
          )}
        </div>
        {secondaryCol && (
          <div
            className={`shrink-0 text-small ${secondaryCol.isMoney ? 'font-mono font-medium' : ''}`}
          >
            {renderCardCellValue(secondaryCol, row)}
          </div>
        )}
      </div>

      {/* Card Details Grid */}
      {otherCols.length > 0 && (
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40 text-small">
          {otherCols.map((col) => (
            <div key={col.key} className="flex flex-col min-w-0">
              <span className="text-caption text-text-muted truncate">{col.header}</span>
              <span
                className={`text-body text-text truncate ${
                  col.isMoney ? 'font-mono font-medium' : ''
                }`}
              >
                {renderCardCellValue(col, row)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DataTableCards<T>({
  columns,
  data,
  keyExtractor,
  hasSelection,
  selectedIds,
  onSelectRow,
  onRowClick,
  emptyState,
  totalsRow,
}: TableCardsProps<T>) {
  if (data.length === 0) {
    return (
      <div className="py-12 px-4 text-center text-text-muted bg-surface rounded-card border border-border">
        {emptyState ?? 'No records available'}
      </div>
    );
  }

  return (
    <div className="space-y-3" role="feed" aria-label="Table card list">
      {data.map((row) => (
        <DataTableCardItem
          key={keyExtractor(row)}
          row={row}
          columns={columns}
          keyExtractor={keyExtractor}
          hasSelection={hasSelection}
          isSelected={selectedIds?.has(keyExtractor(row))}
          onSelectRow={onSelectRow}
          onRowClick={onRowClick}
        />
      ))}

      {totalsRow && (
        <div className="card-mobile bg-surface-sunken/40 border-t-2 border-border mt-3 p-3 font-medium">
          <div className="rule-double mb-2" />
          {totalsRow}
        </div>
      )}
    </div>
  );
}
