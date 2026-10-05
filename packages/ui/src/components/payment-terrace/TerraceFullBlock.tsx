import type { ReactElement } from 'react';
import { formatMoney } from '@exzaestate/shared';
import type { PaymentTerraceItem } from './types.js';
import { toBigInt, getFullBlockClass, getFillPercentage, checkIsOverdue } from './terrace-utils.js';

export interface TerraceFullBlockProps {
  item: PaymentTerraceItem;
  index: number;
  maxAmount: bigint;
  today: string;
  isNextDue: boolean;
  isHovered: boolean;
  isFocused: boolean;
  todayDividerIndex: number;
  onHover: (item: PaymentTerraceItem | null) => void;
  onSelect: (item: PaymentTerraceItem) => void;
}

export function TerraceFullBlock({
  item,
  index,
  maxAmount,
  today,
  isNextDue,
  isHovered,
  isFocused,
  todayDividerIndex,
  onHover,
  onSelect,
}: TerraceFullBlockProps): ReactElement {
  const amount = toBigInt(item.amountPaisa);
  const paid = toBigInt(item.paidPaisa);
  const heightRatio = Number(amount) / Number(maxAmount);
  const blockHeightPx = Math.max(48, Math.round(heightRatio * 140));
  const fillPct = getFillPercentage(paid, amount);
  const isOverdue = checkIsOverdue(item.dueDate, today, paid, amount, item.status);
  const isExcluded = item.status === 'CANCELLED' || item.status === 'WAIVED';
  const hasFill = fillPct > 0 && !isExcluded;
  const showPercentage = blockHeightPx >= 64 && hasFill;
  const fillColorClass = fillPct === 100 ? 'bg-success/80' : 'bg-primary/70';

  return (
    <div
      data-testid={`terrace-block-${item.id}`}
      role="button"
      tabIndex={0}
      aria-label={`${item.label}, Due: ${item.dueDate}, Scheduled: ${formatMoney(amount.toString())}, Paid: ${formatMoney(paid.toString())}`}
      className={`relative flex-1 flex flex-col justify-end items-center group cursor-pointer transition-transform duration-150 ${
        isFocused || isHovered ? 'scale-[1.02]' : ''
      }`}
      style={{ height: `${blockHeightPx}px` }}
      onMouseEnter={() => onHover(item)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onSelect(item)}
    >
      {/* Block Column */}
      <div
        className={`relative w-full h-full rounded-t-button overflow-hidden border transition-all ${getFullBlockClass(isOverdue, isNextDue, item.status)}`}
      >
        {/* Bottom-up fill */}
        {hasFill && (
          <div
            className={`absolute bottom-0 inset-x-0 transition-all duration-300 ${fillColorClass}`}
            style={{ height: `${fillPct}%` }}
          />
        )}

        {/* Percentage Chip inside block if tall enough */}
        {showPercentage && (
          <div className="absolute top-1.5 inset-x-0 text-center">
            <span className="text-caption font-semibold px-1 py-0.5 rounded-button bg-surface/80 text-text shadow-xs">
              {fillPct}%
            </span>
          </div>
        )}
      </div>

      {/* Bottom Label */}
      <div className="mt-2 text-center w-full truncate">
        <div className="text-caption font-semibold text-text truncate">{item.label}</div>
        <div className="text-caption text-text-muted mt-0.5">{item.dueDate.slice(5)}</div>
      </div>

      {/* Today Line Indicator positioned between past and future */}
      {index === todayDividerIndex && (
        <div
          className="absolute -left-1 -top-6 bottom-8 w-0.5 bg-accent z-20 pointer-events-none"
          aria-hidden="true"
        >
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-accent text-primary text-caption font-bold whitespace-nowrap shadow-xs">
            Today
          </span>
        </div>
      )}
    </div>
  );
}
