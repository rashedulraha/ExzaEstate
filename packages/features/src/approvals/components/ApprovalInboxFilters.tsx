import type { ReactElement } from 'react';
import { Input, Select, Button, StickyToolbar } from '@exzaestate/ui';
import { Search, X } from 'lucide-react';
import type { ApprovalFilters } from '../hooks/useApprovalList.js';
import type { ApprovalStatusEnum } from '../schemas/approval.schema.js';

interface ApprovalInboxFiltersProps {
  filters: ApprovalFilters;
  onChange: (updater: (prev: ApprovalFilters) => ApprovalFilters) => void;
  totalCount?: number;
}

export function ApprovalInboxFilters({
  filters,
  onChange,
}: ApprovalInboxFiltersProps): ReactElement {
  const hasActiveFilters = Boolean(
    filters.search || filters.status !== 'ALL' || filters.type !== 'ALL',
  );

  const handleClear = () => {
    onChange((prev) => ({
      ...prev,
      search: '',
      status: 'ALL',
      type: 'ALL',
      page: 1,
    }));
  };

  return (
    <StickyToolbar>
      <div className="p-4 rounded-card border border-border bg-surface shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            id="approval-search"
            placeholder="Search approvals by title, ID, or entity..."
            value={filters.search}
            onChange={(e) => onChange((prev) => ({ ...prev, search: e.target.value }))}
            className="pl-9"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="w-full sm:w-48">
            <Select
              id="approval-status-filter"
              value={filters.status}
              onChange={(val) =>
                onChange((prev) => ({ ...prev, status: val as ApprovalStatusEnum | 'ALL' }))
              }
              options={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'PENDING', label: 'Pending' },
                { value: 'APPROVED', label: 'Approved' },
                { value: 'REJECTED', label: 'Rejected' },
              ]}
            />
          </div>

          <div className="w-full sm:w-48">
            <Select
              id="approval-type-filter"
              value={filters.type}
              onChange={(val) => onChange((prev) => ({ ...prev, type: val }))}
              options={[
                { value: 'ALL', label: 'All Categories' },
                { value: 'DISCOUNT', label: 'Discount' },
                { value: 'EXPENSE', label: 'Expense' },
                { value: 'CANCELLATION', label: 'Cancellation' },
                { value: 'WAIVER', label: 'Waiver' },
              ]}
            />
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="text-text-muted hover:text-text text-small whitespace-nowrap"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Reset
            </Button>
          )}
        </div>
      </div>
    </StickyToolbar>
  );
}
