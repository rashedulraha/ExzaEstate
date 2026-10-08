import { useState, useMemo } from 'react';
import { Plus, Receipt } from 'lucide-react';
import { Button, Select, EmptyState, FilteredEmptyState, DataTableSkeleton } from '@exzaestate/ui';
import { useProjectControllerListProjects } from '@exzaestate/api-client';
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

  const projectsQuery = useProjectControllerListProjects({ limit: 100 });
  const rawProjects =
    (projectsQuery.data as unknown as { items?: Array<{ id: string; name: string }> })?.items ?? [];
  const projectList = useMemo(() => {
    return rawProjects.map((p) => ({ id: p.id, name: p.name }));
  }, [rawProjects]);

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
            <h1 className="text-h1 font-semibold text-text">Office & Project Expenses</h1>
          </div>
          <p className="mt-1 text-caption text-text-muted">
            Track expenses, bills, and manager approvals (GM up to BDT 5,00,000 / MD above BDT
            5,00,000).
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

      {(() => {
        if (isLoading) {
          return <DataTableSkeleton rows={6} cols={6} />;
        }
        if (vouchers.length === 0) {
          return (
            <EmptyState
              dashedBorder
              title="No expense vouchers recorded"
              description="Record operational expenses, vendor bills, or utility disbursements to initiate approval governance."
              actionLabel="New Voucher"
              actionVariant="secondary"
              actionIcon={<Plus className="w-4 h-4" />}
              onAction={() => setIsCreateOpen(true)}
            />
          );
        }
        if (filteredVouchers.length === 0) {
          return (
            <div className="card-workspace border border-border bg-surface p-6">
              <FilteredEmptyState
                title="No matching vouchers found"
                description="No expense vouchers match your selected filter criteria. Try resetting your filter."
                onResetFilters={() => setStatusFilter('ALL')}
              />
            </div>
          );
        }
        return (
          <ExpenseDataTable
            vouchers={filteredVouchers}
            onSelectVoucher={(v) => setSelectedVoucher(v)}
            onCreateVoucher={() => setIsCreateOpen(true)}
          />
        );
      })()}

      <ExpenseCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreated}
        categories={categories}
        projects={projectList}
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
