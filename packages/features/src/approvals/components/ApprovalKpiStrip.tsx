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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="card-stat">
        <div className="text-small font-medium text-text-muted">Pending Verification</div>
        <div className="text-hero-num font-bold text-warning mt-1">{kpis.pendingCount}</div>
      </div>
      <div className="card-stat">
        <div className="text-small font-medium text-text-muted">Discount Exceptions</div>
        <div className="text-hero-num font-bold text-accent mt-1">{kpis.discountCount}</div>
      </div>
      <div className="card-stat">
        <div className="text-small font-medium text-text-muted">Expense Approvals</div>
        <div className="text-hero-num font-bold text-primary mt-1">{kpis.expenseCount}</div>
      </div>
      <div className="card-stat">
        <div className="text-small font-medium text-text-muted">Approved Requests</div>
        <div className="text-hero-num font-bold text-success mt-1">{kpis.approvedCount}</div>
      </div>
    </div>
  );
}
