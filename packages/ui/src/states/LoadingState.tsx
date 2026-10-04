import { DataTableSkeleton, StatCardSkeleton } from '../components/skeleton/Skeleton.js';

export interface LoadingStateProps {
  variant?: 'table' | 'cards' | 'default';
  className?: string;
}

export function LoadingState({ variant = 'table', className = '' }: LoadingStateProps) {
  if (variant === 'cards') {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      <DataTableSkeleton rows={6} cols={5} />
    </div>
  );
}
