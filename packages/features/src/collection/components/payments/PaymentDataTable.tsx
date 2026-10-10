import { formatMoney, formatDate } from '@exzaestate/shared';
import { PERMISSIONS } from '@exzaestate/shared';
import { usePermission } from '@exzaestate/app-core';
import {
  DataTable,
  type ColumnDef,
  StatusBadge,
  Button,
  EmptyState,
  FilteredEmptyState,
} from '@exzaestate/ui';
import { Receipt, Check, RotateCcw, CreditCard, Plus } from 'lucide-react';
import type { PaymentItem } from '../../schemas/collection.schema.js';

export interface PaymentDataTableProps {
  payments: PaymentItem[];
  isLoading?: boolean;
  hasActiveFilters?: boolean;
  onResetFilters?: () => void;
  canCreateDraft?: boolean;
  onRecordPayment?: () => void;
  onViewReceipt?: (payment: PaymentItem) => void;
  onPostPayment?: (payment: PaymentItem) => void;
  onReversePayment?: (payment: PaymentItem) => void;
  className?: string;
}

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank Transfer',
  CHEQUE: 'Cheque',
  BKASH: 'bKash',
  NAGAD: 'Nagad',
  CARD: 'Card',
};

export function PaymentDataTable({
  payments,
  isLoading,
  hasActiveFilters,
  onResetFilters,
  canCreateDraft,
  onRecordPayment,
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
        const readableMethod = METHOD_LABELS[row.paymentMethod] || row.paymentMethod;
        let extra = '';
        if (row.paymentMethod === 'CHEQUE' && row.chequeNumber) {
          extra = ` #${row.chequeNumber}${row.chequeBank ? ` (${row.chequeBank})` : ''}`;
        } else if (
          (row.paymentMethod === 'BKASH' || row.paymentMethod === 'NAGAD') &&
          row.mobileTrxId
        ) {
          extra = ` · ${row.mobileTrxId}`;
        }
        return (
          <span className="text-small text-text">
            {readableMethod}
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
              aria-label={`Post payment ${row.receiptNumber || 'Draft'}`}
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
              aria-label={`View receipt for ${row.receiptNumber || 'Draft'}`}
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
              aria-label={`Reverse payment ${row.receiptNumber}`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reverse</span>
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (payments.length === 0 && !isLoading) {
    return (
      <div className="p-6">
        {hasActiveFilters ? (
          <FilteredEmptyState
            title="No matching payments found"
            description="No collection records match your active search and filter criteria. Try resetting your filters."
            onResetFilters={onResetFilters}
          />
        ) : (
          <EmptyState
            dashedBorder
            icon={<CreditCard className="w-6 h-6" />}
            title="No payments recorded"
            description="Record customer installment collections, cheques, or mobile payments to issue money receipts."
            actionLabel={canCreateDraft && onRecordPayment ? 'Record Payment' : undefined}
            actionVariant="secondary"
            actionIcon={
              canCreateDraft && onRecordPayment ? <Plus className="w-4 h-4" /> : undefined
            }
            onAction={onRecordPayment}
          />
        )}
      </div>
    );
  }

  return (
    <DataTable
      columns={columns}
      data={payments}
      keyExtractor={(row) => row.id}
      isLoading={isLoading}
      className={className || 'border-none shadow-none'}
    />
  );
}
