import { useMemo } from 'react';
import { formatMoney, formatDate } from '@exzaestate/shared';
import {
  DataTable,
  type ColumnDef,
  Button,
  EmptyState,
  FilteredEmptyState,
  StatusBadge,
} from '@exzaestate/ui';
import { Eye, Plus, Receipt } from 'lucide-react';
import type { ExpenseVoucherItem, ExpenseStatusEnum } from '../../schemas/operations.schema.js';

export interface ExpenseDataTableProps {
  vouchers: ExpenseVoucherItem[];
  isLoading?: boolean;
  hasActiveFilters?: boolean;
  onResetFilters?: () => void;
  onSelectVoucher: (voucher: ExpenseVoucherItem) => void;
  onCreateVoucher?: () => void;
  emptyState?: React.ReactNode;
}

export function getExpenseStatusBadge(status: ExpenseStatusEnum) {
  return (
    <span data-testid="expense-status-badge" className="inline-flex">
      <StatusBadge domain="expense" value={status} />
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
      key: 'expenseDate',
      header: 'Date',
      width: '110px',
      render: (row) => (
        <span className="text-text tabular-nums text-small">{formatDate(row.expenseDate)}</span>
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
      width: '90px',
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          title="View Voucher Details"
          aria-label={`View voucher details for ${row.voucherNumber}`}
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
  hasActiveFilters = false,
  onResetFilters,
  onSelectVoucher,
  onCreateVoucher,
  emptyState,
}: ExpenseDataTableProps) {
  const columns = useMemo(() => createExpenseColumns(onSelectVoucher), [onSelectVoucher]);

  const defaultEmpty =
    emptyState ??
    (hasActiveFilters ? (
      <FilteredEmptyState
        title="No matching vouchers found"
        description="No expense vouchers match your active search and filter criteria. Try resetting your filter."
        onResetFilters={onResetFilters}
      />
    ) : (
      <ExpenseEmptyState onCreateVoucher={onCreateVoucher} icon={<Receipt className="w-6 h-6" />} />
    ));

  if (vouchers.length === 0 && !isLoading) {
    return (
      <div className="p-6" data-testid="expense-data-table">
        {defaultEmpty}
      </div>
    );
  }

  return (
    <div className="space-y-0" data-testid="expense-data-table">
      <DataTable
        data={vouchers}
        columns={columns}
        isLoading={isLoading}
        keyExtractor={(item) => item.id}
        className="border-none shadow-none"
      />
    </div>
  );
}
