import React from 'react';
import { Inbox } from 'lucide-react';
import { Button, type ButtonVariant } from '../components/button/Button.js';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionVariant?: ButtonVariant;
  actionIcon?: React.ReactNode;
  dashedBorder?: boolean;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionVariant = 'primary',
  actionIcon,
  dashedBorder = false,
  className = '',
}: EmptyStateProps) {
  const containerClasses = dashedBorder
    ? 'border border-dashed border-border rounded-card bg-surface/30 py-12 px-6 sm:py-16 sm:px-10 my-3'
    : 'py-16 px-4';

  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${containerClasses} ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-surface-sunken flex items-center justify-center text-text-disabled mb-4 border border-border/40">
        {icon ?? <Inbox className="w-6 h-6" aria-hidden="true" />}
      </div>
      <h3 className="text-h3 font-semibold text-text">{title}</h3>
      {description && <p className="text-body text-text-muted mt-1 max-w-sm">{description}</p>}
      {actionLabel && onAction && (
        <div className="mt-5">
          <Button variant={actionVariant} size="md" leftIcon={actionIcon} onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
