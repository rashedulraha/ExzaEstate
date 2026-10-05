import type { ReactElement } from 'react';
import { Input, Select } from '@exzaestate/ui';
import type { ApprovalFilters } from '../hooks/useApprovalList.js';
import type { ApprovalStatusEnum } from '../schemas/approval.schema.js';

interface ApprovalInboxFiltersProps {
  filters: ApprovalFilters;
  onChange: (updater: (prev: ApprovalFilters) => ApprovalFilters) => void;
}

export function ApprovalInboxFilters({
  filters,
  onChange,
}: ApprovalInboxFiltersProps): ReactElement {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      <div className="flex-1">
        <Input
          id="approval-search"
          placeholder="Search approvals by title, ID, or entity..."
          value={filters.search}
          onChange={(e) => onChange((prev) => ({ ...prev, search: e.target.value }))}
        />
      </div>
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
    </div>
  );
}
