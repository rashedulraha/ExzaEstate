import { FilterX } from 'lucide-react';
import { Button } from '../components/button/Button.js';

export interface FilteredEmptyStateProps {
  title?: string;
  description?: string;
  onResetFilters?: () => void;
  className?: string;
}

export function FilteredEmptyState({
  title = 'No results found',
  description = 'No records match your active search and filter criteria.',
  onResetFilters,
  className = '',
}: FilteredEmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
    >
      <div className="w-10 h-10 rounded-full bg-surface-sunken flex items-center justify-center text-text-disabled mb-3">
        <FilterX className="w-5 h-5" aria-hidden="true" />
      </div>
      <h3 className="text-h3 font-semibold text-text">{title}</h3>
      <p className="text-small text-text-muted mt-1 max-w-sm">{description}</p>
      {onResetFilters && (
        <div className="mt-4">
          <Button variant="secondary" size="sm" onClick={onResetFilters}>
            Reset filters
          </Button>
        </div>
      )}
    </div>
  );
}
