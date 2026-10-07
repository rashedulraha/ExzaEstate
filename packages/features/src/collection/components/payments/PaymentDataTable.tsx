import { formatMoney, formatDate } from '@exzaestate/shared';
import { PERMISSIONS } from '@exzaestate/shared';
import { usePermission } from '@exzaestate/app-core';
import { DataTable, type ColumnDef, StatusBadge, Button, EmptyState } from '@exzaestate/ui';
import { Receipt, Check, RotateCcw, CreditCard } from 'lucide-react';
import type { PaymentItem } from '../../schemas/collection.schema.js';

export interface PaymentDataTableProps {
  payments: PaymentItem[];
  isLoading?: boolean;
  onViewReceipt?: (payment: PaymentItem) => void;
  onPostPayment?: (payment: PaymentItem) => void;
  onReversePayment?: (payment: PaymentItem) => void;
  className?: string;
}

export function PaymentDataTable({
  payments,
  isLoading,
  onViewReceipt,
  onPostPayment,
  onReversePayment,
  className,
}: PaymentDataTableProps) {
  const { hasPermission: canPost } = usePermission(PERMISSIONS.PAYMENT_POST);
  const { hasPermission: canReverse } = usePermission(PERMISSIONS.PAYMENT_REVERSE);

  const columns: ColumnDef<PaymentItem>[] = [
    {
      key: 'receiptNumber',
      header: 'Receipt #',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-text font-mono">{row.receiptNumber || 'DRAFT'}</span>
          {row.bookingCode && (
            <span className="text-caption text-text-muted">{row.bookingCode}</span>
          )}
        </div>
      ),
    },
    {
      key: 'paymentDate',
      header: 'Date',
      render: (row) => (
        <span className="text-text tabular-nums">{formatDate(row.paymentDate)}</span>
      ),
    },
    {
      key: 'customerName',
      header: 'Customer',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-text">{row.customerName}</span>
          {row.propertyCode && (
            <span className="text-caption text-text-muted">{row.propertyCode}</span>
          )}
        </div>
      ),
    },
    {
      key: 'paymentMethod',
      header: 'Method',
      render: (row) => {
        let extra = '';
        if (row.paymentMethod === 'CHEQUE' && row.chequeNumber) {
          extra = ` #${row.chequeNumber} (${row.chequeBank || ''})`;
        } else if (
          (row.paymentMethod === 'BKASH' || row.paymentMethod === 'NAGAD') &&
          row.mobileTrxId
        ) {
          extra = ` · ${row.mobileTrxId}`;
        }
        return (
          <span className="text-small text-text">
            {row.paymentMethod}
            {extra && <span className="text-caption text-text-muted">{extra}</span>}
          </span>
        );
      },
    },
    {
      key: 'amountPaisa',
      header: 'Amount',
      align: 'right',
      isMoney: true,
      render: (row) => (
        <span className="font-semibold text-text tabular-nums">{formatMoney(row.amountPaisa)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (row) => <StatusBadge domain="payment" value={row.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {/* Post action is ONLY visible if user has PERMISSIONS.PAYMENT_POST */}
          {row.status === 'DRAFT' && canPost && onPostPayment && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onPostPayment(row)}
              className="gap-1 text-success border-success/30 hover:bg-success/10"
              title="Post payment immutably"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Post</span>
            </Button>
          )}

          {/* Receipt / Voucher view button */}
          {onViewReceipt && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onViewReceipt(row)}
              className="gap-1"
              title="View Money Receipt"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Receipt</span>
            </Button>
          )}

          {/* Reverse action */}
          {row.status === 'POSTED' && canReverse && onReversePayment && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onReversePayment(row)}
              className="gap-1 text-danger border-danger/30 hover:bg-danger/10"
              title="Reverse payment with reason"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reverse</span>
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={payments}
      keyExtractor={(row) => row.id}
      isLoading={isLoading}
      className={className || 'border-none shadow-none'}
      emptyState={
        <EmptyState
          icon={<CreditCard className="w-6 h-6" />}
          title="No Payment Records Found"
          description="No collection records match your criteria. Record installment collections to issue receipts."
          dashedBorder
        />
      }
    />
  );
}
