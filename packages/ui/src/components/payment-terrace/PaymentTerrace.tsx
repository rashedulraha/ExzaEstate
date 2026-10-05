import { useState, useMemo, type ReactElement, type KeyboardEvent } from 'react';
import { formatMoney } from '@exzaestate/shared';
import type { PaymentTerraceItem, PaymentTerraceProps } from './types.js';
import {
  toBigInt,
  getCompactBlockClass,
  calculateTerraceTotals,
  getFillPercentage,
  checkIsOverdue,
} from './terrace-utils.js';
import { TerraceFullBlock } from './TerraceFullBlock.js';

export * from './types.js';
export * from './terrace-utils.js';
export * from './TerraceFullBlock.js';

function getNavTargetIndex(key: string, currentIndex: number, length: number): number {
  if (key === 'ArrowRight') {
    return currentIndex < length - 1 ? currentIndex + 1 : 0;
  }
  return currentIndex > 0 ? currentIndex - 1 : length - 1;
}

export function PaymentTerrace({
  items,
  variant = 'full',
  todayDate,
  onSelectInstallment,
  className = '',
}: PaymentTerraceProps): ReactElement {
  const [hoveredItem, setHoveredItem] = useState<PaymentTerraceItem | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  // Normalize today date string (YYYY-MM-DD)
  const today = useMemo(() => {
    if (todayDate) return todayDate;
    const now = new Date();
    return now.toISOString().split('T')[0] ?? '';
  }, [todayDate]);

  // Sort chronologically by due date
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [items]);

  // Calculate totals and max amount for proportional terrace scaling
  const { maxAmount, totals, nextDueId } = useMemo(() => {
    return calculateTerraceTotals(sortedItems, today);
  }, [sortedItems, today]);

  // Find index of the "today" line
  const todayDividerIndex = useMemo(() => {
    for (let i = 0; i < sortedItems.length; i++) {
      const it = sortedItems[i];
      if (it && it.dueDate >= today) {
        return i;
      }
    }
    return sortedItems.length;
  }, [sortedItems, today]);

  // Keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!sortedItems.length) return;
    const currentIndex = sortedItems.findIndex((it) => it.id === focusedId);

    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const nextIdx = getNavTargetIndex(e.key, currentIndex, sortedItems.length);
      const target = sortedItems[nextIdx];
      if (target) {
        setFocusedId(target.id);
        setHoveredItem(target);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = sortedItems.find((it) => it.id === focusedId);
      if (target) {
        onSelectInstallment?.(target);
      }
    }
  };

  if (!sortedItems.length) {
    return (
      <div
        className={`p-4 bg-surface-sunken border border-border rounded-card text-center text-caption text-text-muted ${className}`}
      >
        No installments scheduled.
      </div>
    );
  }

  // Compact Sparkline Variant
  if (variant === 'compact') {
    return (
      <div
        className={`flex items-end gap-1 h-9 select-none ${className}`}
        aria-label="Payment terrace sparkline"
        role="region"
      >
        {sortedItems.map((item) => {
          const amount = toBigInt(item.amountPaisa);
          const paid = toBigInt(item.paidPaisa);
          const heightRatio = Number(amount) / Number(maxAmount);
          const blockH = Math.max(16, Math.round(heightRatio * 34));
          const fillPct = getFillPercentage(paid, amount);
          const isOverdue = checkIsOverdue(item.dueDate, today, paid, amount, item.status);
          const hasFill = fillPct > 0 && item.status !== 'CANCELLED' && item.status !== 'WAIVED';

          return (
            <div
              key={item.id}
              title={`${item.label}: ${formatMoney(paid.toString())} / ${formatMoney(amount.toString())} (${item.status})`}
              className={`relative flex-1 rounded-t-button overflow-hidden border transition-all cursor-pointer ${getCompactBlockClass(isOverdue, item.status)}`}
              style={{ height: `${blockH}px` }}
              onClick={() => onSelectInstallment?.(item)}
            >
              {hasFill && (
                <div
                  className="absolute bottom-0 inset-x-0 bg-success/80 transition-all duration-200"
                  style={{ height: `${fillPct}%` }}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Full Rich Graphic Variant
  return (
    <div
      data-testid="payment-terrace"
      className={`p-4 bg-surface rounded-card border border-border flex flex-col select-none focus:outline-none focus:ring-1 focus:ring-focus ${className}`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="region"
      aria-label="Payment Terrace Interactive Schedule"
    >
      {/* Header with Title and Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h4 className="text-small font-semibold text-text uppercase tracking-wider">
            Payment Terrace
          </h4>
          <p className="text-caption text-text-muted mt-0.5">
            Proportional installment visualization with bottom-up progress fills
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-caption">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-success" />
            <span className="text-text-muted">Paid</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" />
            <span className="text-text-muted">Partial</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-danger" />
            <span className="text-text-muted">Overdue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-info" />
            <span className="text-text-muted">Next Due</span>
          </div>
        </div>
      </div>

      {/* Terrace Graphic Stage */}
      <div className="relative pt-6 pb-2">
        <div className="flex items-end gap-2 h-44">
          {sortedItems.map((item, index) => (
            <TerraceFullBlock
              key={item.id}
              item={item}
              index={index}
              maxAmount={maxAmount}
              today={today}
              isNextDue={item.id === nextDueId}
              isHovered={hoveredItem?.id === item.id}
              isFocused={focusedId === item.id}
              todayDividerIndex={todayDividerIndex}
              onHover={setHoveredItem}
              onSelect={(selected) => {
                setFocusedId(selected.id);
                onSelectInstallment?.(selected);
              }}
            />
          ))}
        </div>

        {/* Floating Tooltip Card */}
        {hoveredItem && (
          <div className="mt-4 p-3 bg-surface-raised border border-border rounded-card shadow-md flex items-center justify-between gap-4 text-small">
            <div>
              <span className="font-semibold text-text">{hoveredItem.label}</span>
              <span className="text-caption text-text-muted ml-2">Due {hoveredItem.dueDate}</span>
            </div>
            <div className="flex items-center gap-4 text-caption">
              <div>
                <span className="text-text-muted">Scheduled: </span>
                <span className="font-medium text-text">
                  {formatMoney(hoveredItem.amountPaisa.toString())}
                </span>
              </div>
              <div>
                <span className="text-text-muted">Paid: </span>
                <span className="font-semibold text-success">
                  {formatMoney(hoveredItem.paidPaisa.toString())}
                </span>
              </div>
              <div>
                <span className="text-text-muted">Status: </span>
                <span className="font-medium uppercase text-text">{hoveredItem.status}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Ledger Double-Rule and Totals per design.md §7.1 */}
      <div
        data-testid="terrace-totals-row"
        className="mt-4 pt-3 border-t-2 border-b border-border flex flex-wrap items-center justify-between gap-4"
      >
        <div>
          <span className="text-caption text-text-muted uppercase tracking-wider font-semibold">
            Collection Ledger Summary
          </span>
        </div>
        <div className="flex items-center gap-6">
          <div>
            <span className="text-caption text-text-muted mr-1.5">Scheduled:</span>
            <span className="font-semibold text-text font-mono">
              {formatMoney(totals.totalScheduled.toString())}
            </span>
          </div>
          <div>
            <span className="text-caption text-text-muted mr-1.5">Collected:</span>
            <span className="font-bold text-success font-mono">
              {formatMoney(totals.totalPaid.toString())}
            </span>
          </div>
          <div>
            <span className="text-caption text-text-muted mr-1.5">Balance Due:</span>
            <span className="font-semibold text-text font-mono">
              {formatMoney(totals.totalDue.toString())}
            </span>
          </div>
          {totals.totalOverdue > 0n && (
            <div>
              <span className="text-caption text-danger mr-1.5">Overdue:</span>
              <span className="font-bold text-danger font-mono">
                {formatMoney(totals.totalOverdue.toString())}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
