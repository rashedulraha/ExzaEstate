import { useState } from 'react';
import { formatMoney } from '@exzaestate/shared';
import { PERMISSIONS } from '@exzaestate/shared';
import { usePermission } from '@exzaestate/app-core';
import { Button, Input, Select } from '@exzaestate/ui';
import { Plus, Search, DollarSign, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { usePaymentList } from '../hooks/usePaymentList.js';
import { usePaymentActions } from '../hooks/usePaymentActions.js';
import { PaymentDataTable } from '../components/payments/PaymentDataTable.js';
import { PaymentEntryModal } from '../components/payments/PaymentEntryModal.js';
import { PaymentReversalModal } from '../components/payments/PaymentReversalModal.js';
import { MoneyReceiptModal } from '../components/receipts/MoneyReceiptModal.js';
import type {
  PaymentItem,
  PaymentStatusEnum,
  PaymentMethodEnum,
} from '../schemas/collection.schema.js';

export function PaymentListPage() {
  const { hasPermission: canCreateDraft } = usePermission(PERMISSIONS.PAYMENT_CREATE_DRAFT);
  const { payments, kpis, filters, setFilters, isLoading, refetch } = usePaymentList();
  const { createDraftPayment, postPayment, reversePayment } = usePaymentActions();

  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [reversalTarget, setReversalTarget] = useState<PaymentItem | null>(null);
  const [receiptTarget, setReceiptTarget] = useState<PaymentItem | null>(null);

  const handlePost = async (payment: PaymentItem) => {
    await postPayment(payment.id);
    refetch();
  };

  return (
    <div className="space-y-6" data-testid="payment-list-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 font-bold text-text">Collections & Payments</h1>
          <p className="text-small text-text-muted mt-1">
            Record, track, and immutably post client installment payments and money receipts.
          </p>
        </div>

        {canCreateDraft && (
          <Button
            variant="primary"
            onClick={() => setIsEntryModalOpen(true)}
            className="gap-2"
            data-testid="record-payment-btn"
          >
            <Plus className="w-4 h-4" />
            <span>Record Payment</span>
          </Button>
        )}
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 rounded-card border border-border bg-surface flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
              Total Collected
            </span>
            <p className="text-h2 font-bold text-success tabular-nums">
              {formatMoney(kpis.totalCollectedPaisa)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-button bg-success/10 text-success flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-card border border-border bg-surface flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
              Draft / Unposted
            </span>
            <p className="text-h2 font-bold text-warning tabular-nums">
              {formatMoney(kpis.totalDraftPaisa)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-button bg-warning/10 text-warning flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-card border border-border bg-surface flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
              Posted Receipts
            </span>
            <p className="text-h2 font-bold text-text tabular-nums">{kpis.countPosted}</p>
          </div>
          <div className="w-10 h-10 rounded-button bg-primary/10 text-primary-fg flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-card border border-border bg-surface flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
              Pending Cheques
            </span>
            <p className="text-h2 font-bold text-text tabular-nums">{kpis.countChequePending}</p>
          </div>
          <div className="w-10 h-10 rounded-button bg-void/10 text-text-muted flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 p-3 rounded-card border border-border bg-surface">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            id="paymentSearch"
            placeholder="Search by receipt #, customer name, cheque number..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
            className="pl-9"
          />
        </div>

        <div className="w-48">
          <Select
            id="statusFilter"
            value={filters.status}
            options={[
              { value: 'ALL', label: 'All Statuses' },
              { value: 'DRAFT', label: 'Draft' },
              { value: 'POSTED', label: 'Posted' },
              { value: 'REVERSED', label: 'Reversed' },
              { value: 'CANCELLED', label: 'Cancelled' },
            ]}
            onChange={(val) =>
              setFilters({ ...filters, status: val as PaymentStatusEnum | 'ALL', page: 1 })
            }
          />
        </div>

        <div className="w-48">
          <Select
            id="methodFilter"
            value={filters.paymentMethod}
            options={[
              { value: 'ALL', label: 'All Methods' },
              { value: 'CASH', label: 'Cash' },
              { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
              { value: 'CHEQUE', label: 'Cheque' },
              { value: 'BKASH', label: 'bKash' },
              { value: 'NAGAD', label: 'Nagad' },
              { value: 'CARD', label: 'Card' },
            ]}
            onChange={(val) =>
              setFilters({ ...filters, paymentMethod: val as PaymentMethodEnum | 'ALL', page: 1 })
            }
          />
        </div>
      </div>

      {/* Main Payments Data Table */}
      <PaymentDataTable
        payments={payments}
        isLoading={isLoading}
        onViewReceipt={(p) => setReceiptTarget(p)}
        onPostPayment={handlePost}
        onReversePayment={(p) => setReversalTarget(p)}
      />

      {/* Modals */}
      <PaymentEntryModal
        isOpen={isEntryModalOpen}
        onClose={() => setIsEntryModalOpen(false)}
        onSubmitDraft={async (data) => {
          await createDraftPayment(data);
          refetch();
        }}
        onSubmitPost={async (data) => {
          const res = await createDraftPayment(data);
          if (res?.id) {
            await postPayment(res.id);
          }
          refetch();
        }}
      />

      <PaymentReversalModal
        isOpen={Boolean(reversalTarget)}
        onClose={() => setReversalTarget(null)}
        payment={reversalTarget}
        onConfirmReversal={async (data) => {
          await reversePayment(data);
          refetch();
        }}
      />

      <MoneyReceiptModal
        isOpen={Boolean(receiptTarget)}
        onClose={() => setReceiptTarget(null)}
        payment={receiptTarget}
      />
    </div>
  );
}
