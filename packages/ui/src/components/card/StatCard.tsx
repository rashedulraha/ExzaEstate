import React from 'react';
import { StatCardSkeleton } from '../skeleton/Skeleton.js';

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: {
    text: string;
    variant?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'primary';
  };
  valueColor?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary';
  variant?: 'default' | 'brand' | 'success' | 'warning' | 'danger' | 'info';
  isLoading?: boolean;
  className?: string;
  testId?: string;
  onClick?: () => void;
}

const BADGE_VARIANTS: Record<
  NonNullable<NonNullable<StatCardProps['badge']>['variant']>,
  string
> = {
  neutral: 'bg-surface-sunken text-text-muted border border-border',
  success: 'bg-success/12 text-success border border-success/20',
  warning: 'bg-warning/12 text-warning border border-warning/20',
  danger: 'bg-danger/12 text-danger border border-danger/20',
  info: 'bg-info/12 text-info border border-info/20',
  primary: 'bg-primary/10 text-primary border border-primary/20',
};

const VALUE_COLORS: Record<NonNullable<StatCardProps['valueColor']>, string> = {
  default: 'text-text',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  info: 'text-info',
  primary: 'text-primary',
};

export function StatCard({
  label,
  value,
  description,
  icon,
  badge,
  valueColor,
  variant,
  isLoading = false,
  className = '',
  testId,
  onClick,
}: StatCardProps) {
  if (isLoading) {
    return <StatCardSkeleton className={className} />;
  }

  const resolvedValueColor =
    valueColor ??
    (variant === 'brand'
      ? 'primary'
      : variant === 'success'
        ? 'success'
        : variant === 'warning'
          ? 'warning'
          : variant === 'danger'
            ? 'danger'
            : 'default');

  const badgeCls = badge ? BADGE_VARIANTS[badge.variant ?? 'neutral'] : '';
  const colorCls = VALUE_COLORS[resolvedValueColor];

  return (
    <div
      className={`card-stat ${onClick ? 'cursor-pointer hover:border-primary/40' : ''} ${className}`}
      data-testid={testId}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
          {label}
        </span>
        <div className="flex items-center gap-2">
          {icon && <span className="text-text-muted shrink-0">{icon}</span>}
          {badge && (
            <span
              className={`text-caption font-medium px-2 py-0.5 rounded-full select-none ${badgeCls}`}
            >
              {badge.text}
            </span>
          )}
        </div>
      </div>
      <span className={`text-hero-num font-bold mt-1.5 block tabular-nums ${colorCls}`}>
        {value}
      </span>
      {description && (
        <span className="text-caption text-text-muted mt-1 block">{description}</span>
      )}
    </div>
  );
}
