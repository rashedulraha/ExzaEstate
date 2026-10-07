import { useMemo } from 'react';
import { formatMoney } from '@exzaestate/shared';
import { DataTable, type ColumnDef, Button, EmptyState } from '@exzaestate/ui';
import { Eye, Plus, Receipt } from 'lucide-react';
import type { ExpenseVoucherItem, ExpenseStatusEnum } from '../../schemas/operations.schema.js';

export interface ExpenseDataTableProps {
  vouchers: ExpenseVoucherItem[];
  isLoading?: boolean;
  onSelectVoucher: (voucher: ExpenseVoucherItem) => void;
  onCreateVoucher?: () => void;
  emptyState?: React.ReactNode;
}

export function getExpenseStatusBadge(status: ExpenseStatusEnum) {
  const styles: Record<ExpenseStatusEnum, { label: string; cls: string }> = {
    DRAFT: { label: 'DRAFT', cls: 'bg-surface-sunken text-text-muted border-border' },
    SUBMITTED: { label: 'SUBMITTED', cls: 'bg-info/12 text-info border-info/20' },
    APPROVED: { label: 'APPROVED', cls: 'bg-primary/12 text-primary border-primary/20' },
    VERIFIED: { label: 'VERIFIED', cls: 'bg-accent-subtle text-accent-text border-accent-text/20' },
    PAID: { label: 'PAID', cls: 'bg-success/12 text-success border-success/20' },
    REJECTED: { label: 'REJECTED', cls: 'bg-danger/12 text-danger border-danger/20' },
    CANCELLED: {
      label: 'CANCELLED',
      cls: 'bg-surface-sunken text-text-disabled border-border line-through',
    },
  };

  const current = styles[status] || styles.DRAFT;
  return (
    <span
      data-testid="expense-status-badge"
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-caption font-semibold border ${current.cls}`}
    >
      {current.label}
    </span>
  );
}

function createExpenseColumns(
  onSelectVoucher: (voucher: ExpenseVoucherItem) => void,
): ColumnDef<ExpenseVoucherItem>[] {
  return [
    {
      key: 'voucherNumber',
      header: 'Voucher #',
      width: '140px',
      render: (row) => (
        <span className="font-mono font-semibold text-text">{row.voucherNumber}</span>
      ),
    },
    {
      key: 'payeeName',
      header: 'Payee / Vendor',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-text">{row.payeeName}</span>
          {row.description && (
            <span className="text-caption text-text-muted truncate max-w-xs">
              {row.description}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'categoryName',
      header: 'Category & Project',
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-body font-medium text-text">
            {row.categoryName || 'General Expense'}
          </span>
          {row.projectName && (
            <span className="text-caption text-text-muted">{row.projectName}</span>
          )}
        </div>
      ),
    },
    {
      key: 'amountPaisa',
      header: 'Amount (BDT)',
      align: 'right',
      isMoney: true,
      render: (row) => (
        <span className="font-bold text-text tabular-nums">{formatMoney(row.amountPaisa)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Approval Status',
      render: (row) => getExpenseStatusBadge(row.status),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '100px',
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          title="View Voucher Details"
          onClick={() => onSelectVoucher(row)}
          data-testid={`view-expense-${row.id}`}
        >
          <Eye className="w-4 h-4 mr-1 text-text-muted" />
          View
        </Button>
      ),
    },
  ];
}

function ExpenseEmptyState({
  onCreateVoucher,
  icon,
}: {
  onCreateVoucher?: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <EmptyState
      dashedBorder
      icon={icon}
      title="No expense vouchers recorded"
      description="Record operational expenses, vendor bills, or utility disbursements to initiate approval governance."
      actionLabel={onCreateVoucher ? 'New Voucher' : undefined}
      actionVariant="secondary"
      actionIcon={onCreateVoucher ? <Plus className="w-4 h-4" /> : undefined}
      onAction={onCreateVoucher}
    />
  );
}

export function ExpenseDataTable({
  vouchers,
  isLoading = false,
  onSelectVoucher,
  onCreateVoucher,
  emptyState,
}: ExpenseDataTableProps) {
  const columns = useMemo(() => createExpenseColumns(onSelectVoucher), [onSelectVoucher]);

  if (vouchers.length === 0 && !isLoading) {
    if (emptyState) return <>{emptyState}</>;
    return <ExpenseEmptyState onCreateVoucher={onCreateVoucher} />;
  }

  const defaultEmpty = emptyState ?? (
    <ExpenseEmptyState onCreateVoucher={onCreateVoucher} icon={<Receipt className="w-6 h-6" />} />
  );

  return (
    <div className="space-y-4" data-testid="expense-data-table">
      {onCreateVoucher && (
        <div className="flex justify-end">
          <Button variant="primary" onClick={onCreateVoucher} data-testid="create-expense-btn">
            <Plus className="w-4 h-4 mr-1.5" />
            New Expense Voucher
          </Button>
        </div>
      )}

      <DataTable
        data={vouchers}
        columns={columns}
        isLoading={isLoading}
        keyExtractor={(item) => item.id}
        emptyState={defaultEmpty}
        className="border-none shadow-none"
      />
    </div>
  );
}
