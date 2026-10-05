import { Award, CheckCircle, DollarSign, AlertTriangle } from 'lucide-react';
import { formatMoney } from '@exzaestate/shared';
import { Button } from '@exzaestate/ui';
import type { CommissionPayableItem } from '../../schemas/operations.schema.js';

export interface CommissionDataTableProps {
  commissions: CommissionPayableItem[];
  isLoading?: boolean;
  onApprove?: (id: string) => Promise<void>;
  onPay?: (commission: CommissionPayableItem) => void;
}

export function CommissionDataTable({
  commissions,
  isLoading,
  onApprove,
  onPay,
}: CommissionDataTableProps) {
  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-card border border-border bg-surface-sunken/40">
        <p className="text-body text-text-muted">Loading commission payables...</p>
      </div>
    );
  }

  if (commissions.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface-sunken/30 p-6 text-center">
        <Award className="mb-2 h-8 w-8 text-text-muted" />
        <p className="text-body font-medium text-text">No commission records found</p>
        <p className="mt-1 text-caption text-text-muted">
          Commissions are calculated automatically upon booking milestone completion.
        </p>
      </div>
    );
  }

  const getStatusBadge = (status: CommissionPayableItem['status']) => {
    switch (status) {
      case 'EARNED':
        return 'border-info/30 bg-info/10 text-info';
      case 'APPROVED':
        return 'border-warning/30 bg-warning/10 text-warning';
      case 'PAID':
        return 'border-success/30 bg-success/10 text-success';
      case 'REVERSED':
        return 'border-danger/30 bg-danger/10 text-danger';
    }
  };

  return (
    <div className="overflow-x-auto card-workspace">
      <table className="w-full text-left">
        <thead className="border-b border-border bg-surface-sunken/60">
          <tr>
            <th className="px-4 py-3 text-th">Broker / Agent</th>
            <th className="px-4 py-3 text-th">Booking / Unit</th>
            <th className="px-4 py-3 text-th">Customer</th>
            <th className="px-4 py-3 text-right text-th">Commission (BDT)</th>
            <th className="px-4 py-3 text-center text-th">Status</th>
            <th className="px-4 py-3 text-right text-th">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border text-body">
          {commissions.map((comm) => (
            <tr key={comm.id} className="transition-colors hover:bg-surface-sunken/40">
              <td className="px-4 py-3">
                <div className="text-body font-semibold text-text">{comm.brokerName}</div>
                <div className="text-caption text-text-muted">Earned: {comm.earnedAt}</div>
              </td>
              <td className="px-4 py-3">
                <div className="font-mono text-caption text-primary font-medium">
                  {comm.bookingNumber}
                </div>
                {comm.propertyName && (
                  <div className="text-caption text-text-muted">{comm.propertyName}</div>
                )}
              </td>
              <td className="px-4 py-3 text-body text-text-2">{comm.customerName || '—'}</td>
              <td className="px-4 py-3 text-right">
                <div className="text-body font-semibold text-text tabular-nums">
                  {formatMoney(BigInt(comm.amountPaisa))}
                </div>
                {comm.isClawback && (
                  <div className="inline-flex items-center gap-1 rounded-full bg-danger/10 border border-danger/20 px-2 py-0.5 text-caption font-semibold text-danger">
                    <AlertTriangle className="h-3 w-3" />
                    CLAWBACK REVERSAL
                  </div>
                )}
              </td>
              <td className="px-4 py-3 text-center">
                <span
                  className={`inline-flex rounded-full border px-2 py-0.5 text-caption font-semibold ${getStatusBadge(
                    comm.status,
                  )}`}
                >
                  {comm.status}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  {comm.status === 'EARNED' && onApprove && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onApprove(comm.id)}
                      leftIcon={<CheckCircle className="h-3.5 w-3.5" />}
                    >
                      Approve
                    </Button>
                  )}
                  {comm.status === 'APPROVED' && onPay && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onPay(comm)}
                      leftIcon={<DollarSign className="h-3.5 w-3.5" />}
                    >
                      Disburse
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
