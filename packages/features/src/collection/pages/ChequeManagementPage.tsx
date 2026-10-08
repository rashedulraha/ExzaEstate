import { useState, useMemo } from 'react';
import { formatMoney } from '@exzaestate/shared';
import { Input, Select } from '@exzaestate/ui';
import { Search, Clock, CheckCircle2, AlertTriangle, CreditCard } from 'lucide-react';
import { useChequeList } from '../hooks/useChequeList.js';
import { ChequeDataTable } from '../components/cheques/ChequeDataTable.js';
import { MoneyReceiptModal } from '../components/receipts/MoneyReceiptModal.js';
import type { ChequeStatusEnum, PaymentItem } from '../schemas/collection.schema.js';

export function ChequeManagementPage() {
  const {
    cheques,
    allCheques,
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
    clearCheque,
    bounceCheque,
    isLoading,
  } = useChequeList();

  const [receiptPayment, setReceiptPayment] = useState<PaymentItem | null>(null);

  // Compute KPI metrics for cheques
  const kpis = useMemo(() => {
    let pendingPaisa = 0n;
    let clearedPaisa = 0n;
    let bouncedPaisa = 0n;
    let pendingCount = 0;
    let clearedCount = 0;
    let bouncedCount = 0;

    for (const c of allCheques) {
      const paisa = BigInt(c.amountPaisa || '0');
      if (c.status === 'PENDING') {
        pendingPaisa += paisa;
        pendingCount += 1;
      } else if (c.status === 'CLEARED') {
        clearedPaisa += paisa;
        clearedCount += 1;
      } else if (c.status === 'BOUNCED') {
        bouncedPaisa += paisa;
        bouncedCount += 1;
      }
    }

    return {
      pendingPaisa: pendingPaisa.toString(),
      clearedPaisa: clearedPaisa.toString(),
      bouncedPaisa: bouncedPaisa.toString(),
      pendingCount,
      clearedCount,
      bouncedCount,
    };
  }, [allCheques]);

  const handleViewReceipt = (paymentId: string) => {
    const cheque = allCheques.find((c) => c.paymentId === paymentId);
    if (cheque) {
      setReceiptPayment({
        id: cheque.paymentId,
        receiptNumber: `REC-${cheque.chequeNumber}`,
        bookingId: cheque.bookingCode || '',
        bookingCode: cheque.bookingCode,
        customerId: '',
        customerName: cheque.customerName,
        amountPaisa: cheque.amountPaisa,
        paymentMethod: 'CHEQUE',
        paymentDate: cheque.chequeDate,
        status: 'POSTED',
        chequeNumber: cheque.chequeNumber,
        chequeBank: cheque.bankName,
        createdAt: cheque.chequeDate,
      });
    }
  };

  return (
    <div className="space-y-6" data-testid="cheque-management-page">
      {/* Header */}
      <div>
        <h1 className="text-h1 font-bold text-text">Cheque Clearing & Records</h1>
        <p className="text-small text-text-muted mt-1">
          Track received cheques, mark cheques as cleared in bank, and handle bounced cheques.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 rounded-card border border-border bg-surface flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
              Total Cheques
            </span>
            <p className="text-h2 font-bold text-text tabular-nums">{allCheques.length}</p>
          </div>
          <div className="w-10 h-10 rounded-button bg-primary/10 text-primary-fg flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-card border border-border bg-surface flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
              In Bank Clearing ({kpis.pendingCount})
            </span>
            <p className="text-h2 font-bold text-warning tabular-nums">
              {formatMoney(kpis.pendingPaisa)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-button bg-warning/10 text-warning flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-card border border-border bg-surface flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
              Cleared in Bank ({kpis.clearedCount})
            </span>
            <p className="text-h2 font-bold text-success tabular-nums">
              {formatMoney(kpis.clearedPaisa)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-button bg-success/10 text-success flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-card border border-border bg-surface flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
              Bounced Cheques ({kpis.bouncedCount})
            </span>
            <p className="text-h2 font-bold text-danger tabular-nums">
              {formatMoney(kpis.bouncedPaisa)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-button bg-danger/10 text-danger flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 p-3 rounded-card border border-border bg-surface">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            id="chequeSearch"
            placeholder="Search by cheque number, customer name, bank name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="w-56">
          <Select
            id="chequeStatusFilter"
            value={statusFilter}
            options={[
              { value: 'ALL', label: 'All Cheque Statuses' },
              { value: 'PENDING', label: 'Pending Clearance' },
              { value: 'CLEARED', label: 'Cleared' },
              { value: 'BOUNCED', label: 'Bounced' },
            ]}
            onChange={(val) => setStatusFilter(val as ChequeStatusEnum | 'ALL')}
          />
        </div>
      </div>

      {/* Cheque Data Table */}
      <ChequeDataTable
        cheques={cheques}
        isLoading={isLoading}
        onClearCheque={clearCheque}
        onBounceCheque={bounceCheque}
        onViewReceipt={handleViewReceipt}
      />

      {/* Receipt Modal */}
      <MoneyReceiptModal
        isOpen={Boolean(receiptPayment)}
        onClose={() => setReceiptPayment(null)}
        payment={receiptPayment}
      />
    </div>
  );
}
