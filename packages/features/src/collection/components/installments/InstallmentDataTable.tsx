import { formatMoney, formatDate } from '@exzaestate/shared';
import { DataTable, type ColumnDef, Button } from '@exzaestate/ui';
import { CreditCard } from 'lucide-react';
import type { InstallmentScheduleItem } from '../../schemas/collection.schema.js';
import { getCombinedInstallmentChip } from '../../hooks/useInstallmentList.js';

export interface InstallmentDataTableProps {
  installments: InstallmentScheduleItem[];
  isLoading?: boolean;
  onPayInstallment?: (installment: InstallmentScheduleItem) => void;
}

export function InstallmentDataTable({
  installments,
  isLoading,
  onPayInstallment,
}: InstallmentDataTableProps) {
  const columns: ColumnDef<InstallmentScheduleItem>[] = [
    {
      key: 'installmentNumber',
      header: '#',
      width: '60px',
      render: (row) => (
        <span className="font-semibold text-text tabular-nums">#{row.installmentNumber}</span>
      ),
    },
    {
      key: 'name',
      header: 'Installment Name',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-text">{row.name}</span>
          {row.lateFeePaisa && BigInt(row.lateFeePaisa) > 0n && (
            <span className="text-caption text-danger">
              Late Fee: {formatMoney(row.lateFeePaisa)}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      render: (row) => <span className="text-text tabular-nums">{formatDate(row.dueDate)}</span>,
    },
    {
      key: 'amountPaisa',
      header: 'Scheduled',
      align: 'right',
      isMoney: true,
      render: (row) => (
        <span className="font-medium text-text tabular-nums">{formatMoney(row.amountPaisa)}</span>
      ),
    },
    {
      key: 'paidPaisa',
      header: 'Paid',
      align: 'right',
      isMoney: true,
      render: (row) => (
        <span className="text-success font-medium tabular-nums">{formatMoney(row.paidPaisa)}</span>
      ),
    },
    {
      key: 'remainingPaisa',
      header: 'Remaining',
      align: 'right',
      isMoney: true,
      render: (row) => (
        <span className="font-semibold text-text tabular-nums">
          {formatMoney(row.remainingPaisa)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status & Aging',
      align: 'center',
      render: (row) => {
        const chip = getCombinedInstallmentChip(row.status, row.daysOverdue);
        const variantStyles: Record<string, string> = {
          success: 'text-success bg-success/12 border-success/20',
          danger: 'text-danger bg-danger/12 border-danger/20',
          warning: 'text-warning bg-warning/12 border-warning/20',
          info: 'text-info bg-info/12 border-info/20',
          void: 'text-void bg-void/12 border-void/20',
          special: 'text-special bg-special/12 border-special/20',
        };

        return (
          <span
            data-testid="installment-status-chip"
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-caption font-medium border ${
              variantStyles[chip.variant] || 'text-text-muted bg-surface-sunken border-border'
            }`}
          >
            {chip.label}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => {
        const canPay =
          row.status !== 'PAID' &&
          row.status !== 'CANCELLED' &&
          row.status !== 'WAIVED' &&
          BigInt(row.remainingPaisa) > 0n;

        if (!canPay || !onPayInstallment) return null;

        return (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPayInstallment(row)}
            className="gap-1.5"
            title="Collect payment for this installment"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Pay</span>
          </Button>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={installments}
      keyExtractor={(row) => row.id}
      isLoading={isLoading}
      emptyState={
        <div className="py-12 text-center text-text-muted">
          No installments scheduled for this booking.
        </div>
      }
    />
  );
}
