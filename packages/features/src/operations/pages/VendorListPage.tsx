import { useState } from 'react';
import { Plus, Building2, Receipt } from 'lucide-react';
import { formatMoney } from '@exzaestate/shared';
import { Button, EmptyState } from '@exzaestate/ui';
import { useVendors } from '../hooks/useVendors.js';
import { VendorDataTable } from '../components/vendors/VendorDataTable.js';
import { VendorModal } from '../components/vendors/VendorModal.js';
import { VendorBillModal } from '../components/vendors/VendorBillModal.js';
import { VendorBillDrawer } from '../components/vendors/VendorBillDrawer.js';
import { VendorPaymentModal } from '../components/vendors/VendorPaymentModal.js';
import type {
  VendorItem,
  VendorBillItem,
  CreateVendorInput,
  CreateVendorBillInput,
  CreateVendorPaymentInput,
} from '../schemas/operations.schema.js';

function getBillStatusBadge(status: VendorBillItem['status']) {
  switch (status) {
    case 'DRAFT':
      return 'border-border bg-surface-sunken text-text-muted';
    case 'POSTED':
      return 'border-info/30 bg-info/10 text-info';
    case 'PAID':
      return 'border-success/30 bg-success/10 text-success';
    case 'CANCELLED':
      return 'border-danger/30 bg-danger/10 text-danger';
  }
}

function VendorBillsTab({
  bills,
  onOpenNewBill,
  onSelectBill,
}: {
  bills: VendorBillItem[];
  onOpenNewBill: () => void;
  onSelectBill: (bill: VendorBillItem) => void;
}) {
  if (bills.length === 0) {
    return (
      <EmptyState
        dashedBorder
        title="No vendor bills recorded"
        description="Record procurement bills from suppliers to manage accounts payable and withholding tax (TDS / VDS)."
        actionLabel="New Bill"
        actionVariant="secondary"
        actionIcon={<Plus className="w-4 h-4" />}
        onAction={onOpenNewBill}
      />
    );
  }

  return (
    <div className="overflow-x-auto card-workspace">
      <table className="w-full text-left">
        <thead className="border-b border-border bg-surface-sunken/60">
          <tr>
            <th className="px-4 py-3 text-th">Bill Number</th>
            <th className="px-4 py-3 text-th">Vendor</th>
            <th className="px-4 py-3 text-th">Date</th>
            <th className="px-4 py-3 text-right text-th">Net Payable</th>
            <th className="px-4 py-3 text-center text-th">Status</th>
            <th className="px-4 py-3 text-right text-th">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border text-body">
          {bills.map((bill: VendorBillItem) => (
            <tr key={bill.id} className="transition-colors hover:bg-surface-sunken/40">
              <td className="px-4 py-3 font-mono font-medium text-primary">{bill.billNumber}</td>
              <td className="px-4 py-3 font-medium text-text">{bill.vendorName}</td>
              <td className="px-4 py-3 text-text-muted">{bill.billDate}</td>
              <td className="px-4 py-3 text-right font-semibold text-text tabular-nums">
                {formatMoney(BigInt(bill.netPayablePaisa))}
              </td>
              <td className="px-4 py-3 text-center">
                <span
                  className={`inline-flex rounded-full border px-2 py-0.5 text-caption font-semibold ${getBillStatusBadge(
                    bill.status,
                  )}`}
                >
                  {bill.status}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <Button variant="ghost" size="sm" onClick={() => onSelectBill(bill)}>
                  View
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function VendorListPage() {
  const [tab, setTab] = useState<'VENDORS' | 'BILLS'>('VENDORS');
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<VendorItem | null>(null);
  const [selectedBill, setSelectedBill] = useState<VendorBillItem | null>(null);

  const {
    vendors = [],
    isLoadingVendors,
    refetchVendors,
    bills = [],
    refetchBills,
    createVendor,
    createBill,
    postBill,
    createPayment,
  } = useVendors();

  const handleCreateVendor = async (input: CreateVendorInput) => {
    await createVendor(input);
    refetchVendors();
  };

  const handleCreateBill = async (input: CreateVendorBillInput) => {
    await createBill(input);
    refetchBills();
    refetchVendors();
  };

  const handlePostBill = async (billId: string) => {
    await postBill(billId);
    refetchBills();
    refetchVendors();
  };

  const handleCreatePayment = async (input: CreateVendorPaymentInput) => {
    await createPayment(input);
    refetchBills();
    refetchVendors();
  };

  return (
    <div className="container-page space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <h1 className="text-h1 font-semibold text-text">Vendors & Accounts Payable</h1>
          </div>
          <p className="mt-1 text-caption text-text-muted">
            Supplier management, procurement billing, and withholding taxes (TDS / VDS)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-button border border-border bg-surface-sunken p-0.5">
            <button
              type="button"
              onClick={() => setTab('VENDORS')}
              className={`rounded-button px-3 py-1.5 text-btn cursor-pointer transition-colors ${
                tab === 'VENDORS'
                  ? 'bg-surface text-text shadow-sm'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Vendors ({vendors.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('BILLS')}
              className={`rounded-button px-3 py-1.5 text-btn cursor-pointer transition-colors ${
                tab === 'BILLS'
                  ? 'bg-surface text-text shadow-sm'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Bills ({bills.length})
            </button>
          </div>

          {tab === 'VENDORS' ? (
            <Button
              variant="primary"
              onClick={() => setIsVendorModalOpen(true)}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Add Vendor
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => {
                setSelectedVendor(null);
                setIsBillModalOpen(true);
              }}
              leftIcon={<Receipt className="h-4 w-4" />}
            >
              New Bill
            </Button>
          )}
        </div>
      </div>

      {tab === 'VENDORS' ? (
        <VendorDataTable
          vendors={vendors}
          isLoading={isLoadingVendors}
          onSelectVendor={(v) => setSelectedVendor(v)}
          onCreateBill={(v) => {
            setSelectedVendor(v);
            setIsBillModalOpen(true);
          }}
          onPayVendor={(v) => {
            setSelectedVendor(v);
            setIsPaymentModalOpen(true);
          }}
        />
      ) : (
        <VendorBillsTab
          bills={bills}
          onOpenNewBill={() => {
            setSelectedVendor(null);
            setIsBillModalOpen(true);
          }}
          onSelectBill={setSelectedBill}
        />
      )}

      <VendorModal
        isOpen={isVendorModalOpen}
        onClose={() => setIsVendorModalOpen(false)}
        onSubmit={handleCreateVendor}
      />

      <VendorBillModal
        isOpen={isBillModalOpen}
        onClose={() => {
          setIsBillModalOpen(false);
          setSelectedVendor(null);
        }}
        onSubmit={handleCreateBill}
        vendors={vendors}
        preselectedVendorId={selectedVendor?.id}
      />

      <VendorPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedVendor(null);
        }}
        onSubmit={handleCreatePayment}
        vendor={selectedVendor}
      />

      <VendorBillDrawer
        isOpen={Boolean(selectedBill)}
        onClose={() => setSelectedBill(null)}
        bill={selectedBill}
        onPostToAp={handlePostBill}
      />
    </div>
  );
}
