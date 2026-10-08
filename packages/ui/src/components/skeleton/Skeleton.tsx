import React from 'react';

export interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: 'button' | 'card' | 'modal' | 'full';
}

const roundedMap = {
  button: 'rounded-button',
  card: 'rounded-card',
  modal: 'rounded-modal',
  full: 'rounded-full',
};

export function Skeleton({ className = '', width, height, rounded = 'button' }: SkeletonProps) {
  const style: React.CSSProperties = {
    width: width !== undefined ? width : undefined,
    height: height !== undefined ? height : undefined,
  };

  return (
    <div
      style={style}
      aria-hidden="true"
      className={`bg-surface-sunken animate-skeleton-breathe ${roundedMap[rounded]} ${className}`}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="card-surface p-5 space-y-3">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-8 w-36" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

import { useIsMobile } from '../../layout/useIsMobile.js';

export function DataTableSkeleton({
  rows = 6,
  cols = 5,
  variant = 'auto',
}: {
  rows?: number;
  cols?: number;
  variant?: 'table' | 'cards' | 'auto';
}) {
  const isMobile = useIsMobile(768);
  const shouldRenderCards = variant === 'cards' || (variant === 'auto' && isMobile);

  if (shouldRenderCards) {
    return (
      <div className="space-y-3 w-full" aria-label="Loading records" role="status">
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className="card-mobile border border-border bg-surface p-4 space-y-3 animate-skeleton-breathe"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40">
              <div className="space-y-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const widths = ['w-24', 'w-36', 'w-28', 'w-48', 'w-20'];
  return (
    <div className="w-full card-workspace border border-border">
      {/* Table Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-sunken/40">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className={`h-4 ${widths[i % widths.length]}`} />
        ))}
      </div>
      {/* Table Rows */}
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center justify-between px-4 py-3">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className={`h-4 ${widths[(c + r) % widths.length]}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
