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

export function DataTableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
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
