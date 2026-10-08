import { useState } from 'react';
import { useNavigate } from 'react-router';
import { formatMoney } from '@exzaestate/shared';
import { PERMISSIONS } from '@exzaestate/shared';
import { usePermission } from '@exzaestate/app-core';
import { Button, Input, Select, Breadcrumbs, StickyToolbar } from '@exzaestate/ui';
import { Plus, Search, X } from 'lucide-react';
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
  const navigate = useNavigate();
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

  const hasActiveFilters = Boolean(
    filters.search || filters.status !== 'ALL' || filters.paymentMethod !== 'ALL',
  );

  const handleClearFilters = () => {
    setFilters({
      ...filters,
      search: '',
      status: 'ALL',
      paymentMethod: 'ALL',
      page: 1,
    });
  };

  return (
    <div className="container-page space-y-6" data-testid="payment-list-page">
      {/* Tier 1: Page Shell & Clean Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Breadcrumbs
            items={[
              { label: 'Overview', href: '/dashboard', onClick: () => navigate('/dashboard') },
              { label: 'Finance & Accounts' },
              { label: 'Payments & Receipts' },
            ]}
          />
          <div className="flex items-center gap-3 mt-1.5">
            <h1 className="text-h1 font-bold text-text">Payments & Receipts</h1>
            <span className="text-caption font-semibold px-2.5 py-0.5 rounded-full bg-surface-sunken text-text-2 border border-border">
              {payments.length} {payments.length === 1 ? 'Record' : 'Records'}
            </span>
          </div>
          <p className="text-small text-text-muted mt-1">
            Record and view customer installment payments, money receipts, and cheques.
          </p>
        </div>

        {canCreateDraft && (
          <Button
            variant="primary"
            onClick={() => setIsEntryModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
            data-testid="record-payment-btn"
          >
            Record Payment
          </Button>
        )}
      </div>

      {/* Tier 2: Responsive KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card-stat">
          <div className="flex items-center justify-between">
            <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
              Total Collected
            </span>
            <span className="text-caption font-medium px-2 py-0.5 rounded-full bg-success/12 text-success">
              Received
            </span>
          </div>
          <span className="text-hero-num font-bold text-success mt-1.5 block tabular-nums">
            {formatMoney(kpis.totalCollectedPaisa)}
          </span>
          <span className="text-caption text-text-muted mt-1 block">
            Total confirmed collections received
          </span>
        </div>

        <div className="card-stat">
          <div className="flex items-center justify-between">
            <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
              Pending Confirmation
            </span>
            <span className="text-caption font-medium px-2 py-0.5 rounded-full bg-warning/12 text-warning">
              Pending
            </span>
          </div>
          <span className="text-hero-num font-bold text-warning mt-1.5 block tabular-nums">
            {formatMoney(kpis.totalDraftPaisa)}
          </span>
          <span className="text-caption text-text-muted mt-1 block">
            Draft payments awaiting review
          </span>
        </div>

        <div className="card-stat">
          <div className="flex items-center justify-between">
            <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
              Confirmed Receipts
            </span>
            <span className="text-caption font-medium px-2 py-0.5 rounded-full bg-surface-sunken text-text-muted">
              Receipts
            </span>
          </div>
          <span className="text-hero-num font-bold text-text mt-1.5 block tabular-nums">
            {kpis.countPosted}
          </span>
          <span className="text-caption text-text-muted mt-1 block">Issued money receipts</span>
        </div>

        <div className="card-stat">
          <div className="flex items-center justify-between">
            <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
              Pending Cheques
            </span>
            <span className="text-caption font-medium px-2 py-0.5 rounded-full bg-surface-sunken text-text-muted">
              Clearing
            </span>
          </div>
          <span className="text-hero-num font-bold text-text mt-1.5 block tabular-nums">
            {kpis.countChequePending}
          </span>
          <span className="text-caption text-text-muted mt-1 block">Cheques in bank clearing</span>
        </div>
      </div>

      {/* Tier 3: Sticky Filter Toolbar */}
      <StickyToolbar>
        <div className="p-4 rounded-card border border-border bg-surface shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
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

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="w-full sm:w-48">
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

            <div className="w-full sm:w-48">
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
                  setFilters({
                    ...filters,
                    paymentMethod: val as PaymentMethodEnum | 'ALL',
                    page: 1,
                  })
                }
              />
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-text-muted hover:text-text text-small whitespace-nowrap"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Reset
              </Button>
            )}
          </div>
        </div>
      </StickyToolbar>

      {/* Tier 4: Main Payments Data Table */}
      <div className="rounded-card border border-border bg-surface shadow-xs">
        <PaymentDataTable
          payments={payments}
          isLoading={isLoading}
          onViewReceipt={(p) => setReceiptTarget(p)}
          onPostPayment={handlePost}
          onReversePayment={(p) => setReversalTarget(p)}
          className="border-none shadow-none"
        />
      </div>

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
