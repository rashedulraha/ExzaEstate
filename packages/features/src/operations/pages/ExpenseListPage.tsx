import { useState } from 'react';
import { Plus, Receipt } from 'lucide-react';
import { Button, Select } from '@exzaestate/ui';
import { useExpenses } from '../hooks/useExpenses.js';
import { ExpenseDataTable } from '../components/expenses/ExpenseDataTable.js';
import { ExpenseCreateModal } from '../components/expenses/ExpenseCreateModal.js';
import { ExpenseDrawer } from '../components/expenses/ExpenseDrawer.js';
import { ExpensePayModal } from '../components/expenses/ExpensePayModal.js';
import type {
  ExpenseVoucherItem,
  CreateExpenseInput,
  ExpensePaymentMethodEnum,
} from '../schemas/operations.schema.js';

export function ExpenseListPage() {
  const [selectedVoucher, setSelectedVoucher] = useState<ExpenseVoucherItem | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const {
    vouchers = [],
    categories = [],
    isLoading,
    refetch,
    createVoucher,
    submitVoucher,
    approveVoucher,
    verifyVoucher,
    payVoucher,
    rejectVoucher,
  } = useExpenses();

  const filteredVouchers = vouchers.filter((v: ExpenseVoucherItem) => {
    if (statusFilter === 'ALL') return true;
    return v.status === statusFilter;
  });

  const handleCreated = async (input: CreateExpenseInput) => {
    await createVoucher(input);
    refetch();
  };

  const handleSubmitVoucher = async (id: string) => {
    await submitVoucher(id);
    refetch();
  };

  const handleApproveVoucher = async (id: string) => {
    await approveVoucher(id);
    refetch();
  };

  const handleVerifyVoucher = async (id: string) => {
    await verifyVoucher(id);
    refetch();
  };

  const handleRejectVoucher = async (id: string, reason: string) => {
    await rejectVoucher(id, { reason });
    refetch();
  };

  const handlePayVoucher = async (input: {
    paymentMethod: ExpensePaymentMethodEnum;
    bankAccountId?: string;
    bankAccountCode?: string;
    reference?: string;
  }) => {
    if (!selectedVoucher) return;
    await payVoucher(selectedVoucher.id, input);
    refetch();
  };

  const statusOptions = [
    { label: 'All Vouchers', value: 'ALL' },
    { label: 'Draft', value: 'DRAFT' },
    { label: 'Submitted', value: 'SUBMITTED' },
    { label: 'Verified', value: 'VERIFIED' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Paid', value: 'PAID' },
    { label: 'Rejected', value: 'REJECTED' },
  ];

  return (
    <div className="container-page space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="h-6 w-6 text-primary" />
            <h1 className="text-h1 font-semibold text-text">Operational Expenses & Vouchers</h1>
          </div>
          <p className="mt-1 text-caption text-text-muted">
            Threshold-driven approval governance (GM ≤ ৳5,00,000 / MD &gt; ৳5,00,000)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-36">
            <Select
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              options={statusOptions}
            />
          </div>

          <Button
            variant="primary"
            onClick={() => setIsCreateOpen(true)}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            New Voucher
          </Button>
        </div>
      </div>

      <ExpenseDataTable
        vouchers={filteredVouchers}
        isLoading={isLoading}
        onSelectVoucher={(v) => setSelectedVoucher(v)}
      />

      <ExpenseCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreated}
        categories={categories}
      />

      <ExpenseDrawer
        isOpen={Boolean(selectedVoucher) && !isPayOpen}
        onClose={() => setSelectedVoucher(null)}
        voucher={selectedVoucher}
        onSubmit={handleSubmitVoucher}
        onApprove={handleApproveVoucher}
        onVerify={handleVerifyVoucher}
        onPay={() => setIsPayOpen(true)}
        onReject={handleRejectVoucher}
      />

      <ExpensePayModal
        isOpen={isPayOpen}
        onClose={() => setIsPayOpen(false)}
        voucher={selectedVoucher}
        onPay={handlePayVoucher}
      />
    </div>
  );
}
