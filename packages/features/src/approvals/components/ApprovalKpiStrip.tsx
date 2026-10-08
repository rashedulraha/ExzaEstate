import type { ReactElement } from 'react';

interface ApprovalKpiStripProps {
  kpis: {
    pendingCount: number;
    discountCount: number;
    expenseCount: number;
    approvedCount: number;
  };
}

export function ApprovalKpiStrip({ kpis }: ApprovalKpiStripProps): ReactElement {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="card-stat">
        <div className="flex items-center justify-between">
          <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
            Pending Review
          </span>
          <span className="text-caption font-medium px-2 py-0.5 rounded-full bg-warning/12 text-warning">
            Action Req.
          </span>
        </div>
        <span className="text-hero-num font-bold text-warning mt-1.5 block tabular-nums">
          {kpis.pendingCount}
        </span>
        <span className="text-caption text-text-muted mt-1 block">
          Awaiting management approval
        </span>
      </div>

      <div className="card-stat">
        <div className="flex items-center justify-between">
          <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
            Discount Requests
          </span>
          <span className="text-caption font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            Discounts
          </span>
        </div>
        <span className="text-hero-num font-bold text-primary mt-1.5 block tabular-nums">
          {kpis.discountCount}
        </span>
        <span className="text-caption text-text-muted mt-1 block">
          Special price discount requests
        </span>
      </div>

      <div className="card-stat">
        <div className="flex items-center justify-between">
          <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
            Expense Requests
          </span>
          <span className="text-caption font-medium px-2 py-0.5 rounded-full bg-info/10 text-info">
            Expenses
          </span>
        </div>
        <span className="text-hero-num font-bold text-text mt-1.5 block tabular-nums">
          {kpis.expenseCount}
        </span>
        <span className="text-caption text-text-muted mt-1 block">
          Office & project expense bills
        </span>
      </div>

      <div className="card-stat">
        <div className="flex items-center justify-between">
          <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
            Approved Items
          </span>
          <span className="text-caption font-medium px-2 py-0.5 rounded-full bg-success/12 text-success">
            Approved
          </span>
        </div>
        <span className="text-hero-num font-bold text-success mt-1.5 block tabular-nums">
          {kpis.approvedCount}
        </span>
        <span className="text-caption text-text-muted mt-1 block">Approved in current cycle</span>
      </div>
    </div>
  );
}
