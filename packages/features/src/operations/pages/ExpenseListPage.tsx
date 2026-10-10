import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { formatMoney } from '@exzaestate/shared';
import { Plus, Search, X } from 'lucide-react';
import { Button, Input, Select, Breadcrumbs, StickyToolbar, StatCard } from '@exzaestate/ui';
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
  const navigate = useNavigate();
  const [selectedVoucher, setSelectedVoucher] = useState<ExpenseVoucherItem | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

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

  const kpiStats = useMemo(() => {
    let totalPaidPaisa = 0n;
    let pendingApprovalPaisa = 0n;
    let countPending = 0;
    let approvedPaisa = 0n;
    let countApproved = 0;
    let countDraft = 0;

    for (const v of vouchers) {
      let amount = 0n;
      try {
        amount = BigInt(v.amountPaisa || '0');
      } catch {
        amount = 0n;
      }

      if (v.status === 'PAID') {
        totalPaidPaisa += amount;
      } else if (v.status === 'APPROVED') {
        approvedPaisa += amount;
        countApproved++;
      } else if (v.status === 'SUBMITTED' || v.status === 'VERIFIED') {
        pendingApprovalPaisa += amount;
        countPending++;
      } else if (v.status === 'DRAFT') {
        countDraft++;
      }
    }

    return {
      totalPaidPaisa: totalPaidPaisa.toString(),
      pendingApprovalPaisa: pendingApprovalPaisa.toString(),
      countPending,
      approvedPaisa: approvedPaisa.toString(),
      countApproved,
      countDraft,
    };
  }, [vouchers]);

  const filteredVouchers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return vouchers.filter((v: ExpenseVoucherItem) => {
      if (statusFilter !== 'ALL' && v.status !== statusFilter) {
        return false;
      }

      if (q) {
        const matchesVoucher = v.voucherNumber?.toLowerCase().includes(q);
        const matchesPayee = v.payeeName?.toLowerCase().includes(q);
        const matchesDesc = v.description?.toLowerCase().includes(q);
        const matchesCategory = v.categoryName?.toLowerCase().includes(q);
        const matchesProject = v.projectName?.toLowerCase().includes(q);

        if (
          !matchesVoucher &&
          !matchesPayee &&
          !matchesDesc &&
          !matchesCategory &&
          !matchesProject
        ) {
          return false;
        }
      }

      return true;
    });
  }, [vouchers, statusFilter, searchQuery]);

  const hasActiveFilters = Boolean(searchQuery.trim() || statusFilter !== 'ALL');

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
  };

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
    <div className="container-page space-y-6" data-testid="expense-list-page">
      {/* Tier 1: Page Shell & Clean Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Breadcrumbs
            items={[
              { label: 'Overview', href: '/dashboard', onClick: () => navigate('/dashboard') },
              { label: 'Finance & Treasury' },
              { label: 'Office & Project Expenses' },
            ]}
          />
          <div className="flex items-center gap-3 mt-1.5">
            <h1 className="text-h1 font-bold text-text">Office & Project Expenses</h1>
            <span className="text-caption font-semibold px-2.5 py-0.5 rounded-full bg-surface-sunken text-text-2 border border-border">
              {vouchers.length} {vouchers.length === 1 ? 'Record' : 'Records'}
            </span>
          </div>
          <p className="text-small text-text-muted mt-1">
            Track expenses, bills, and manager approvals (GM up to BDT 5,00,000 / MD above BDT
            5,00,000).
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsCreateOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
          data-testid="create-expense-btn"
        >
          New Voucher
        </Button>
      </div>

      {/* Tier 2: Responsive KPI Cards Strip using reusable StatCard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total Settled"
          value={formatMoney(kpiStats.totalPaidPaisa)}
          description="Paid and disbursed expenses"
          badge={{ text: 'Settled', variant: 'success' }}
          valueColor="success"
          isLoading={isLoading}
        />
        <StatCard
          label="Pending Review"
          value={formatMoney(kpiStats.pendingApprovalPaisa)}
          description={`${kpiStats.countPending} vouchers awaiting approval`}
          badge={{ text: 'In Review', variant: 'warning' }}
          valueColor="warning"
          isLoading={isLoading}
        />
        <StatCard
          label="Ready to Pay"
          value={formatMoney(kpiStats.approvedPaisa)}
          description={`${kpiStats.countApproved} approved disbursements`}
          badge={{ text: 'Payable', variant: 'info' }}
          valueColor="info"
          isLoading={isLoading}
        />
        <StatCard
          label="Total Vouchers"
          value={vouchers.length}
          description={`${kpiStats.countDraft} drafts in preparation`}
          badge={{ text: 'All Records', variant: 'neutral' }}
          isLoading={isLoading}
        />
      </div>

      {/* Tier 3: Unified Expenses Workspace Card */}
      <div className="rounded-card border border-border bg-surface shadow-xs">
        <StickyToolbar className="p-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                id="expenseSearch"
                placeholder="Search by voucher #, payee / vendor, description, project..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="w-full sm:w-48">
                <Select
                  id="expenseStatusFilter"
                  value={statusFilter}
                  onChange={(val) => setStatusFilter(val)}
                  options={statusOptions}
                />
              </div>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="text-text-muted hover:text-text text-small whitespace-nowrap"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Reset
                </Button>
              )}
            </div>
          </div>
        </StickyToolbar>

        <ExpenseDataTable
          vouchers={filteredVouchers}
          isLoading={isLoading}
          hasActiveFilters={hasActiveFilters}
          onResetFilters={handleResetFilters}
          onSelectVoucher={(v) => setSelectedVoucher(v)}
          onCreateVoucher={() => setIsCreateOpen(true)}
        />
      </div>

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
