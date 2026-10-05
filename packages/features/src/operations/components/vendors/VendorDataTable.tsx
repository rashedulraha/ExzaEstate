import { Building2, Phone, Mail, FileText, DollarSign, Eye } from 'lucide-react';
import { formatMoney } from '@exzaestate/shared';
import { IconButton } from '@exzaestate/ui';
import type { VendorItem } from '../../schemas/operations.schema.js';

export interface VendorDataTableProps {
  vendors: VendorItem[];
  isLoading?: boolean;
  onSelectVendor?: (vendor: VendorItem) => void;
  onCreateBill?: (vendor: VendorItem) => void;
  onPayVendor?: (vendor: VendorItem) => void;
}

function VendorContactCell({ phone, email }: { phone?: string | null; email?: string | null }) {
  return (
    <div className="space-y-0.5 text-caption">
      {phone && (
        <div className="flex items-center gap-1 text-text">
          <Phone className="h-3 w-3 text-text-muted" />
          {phone}
        </div>
      )}
      {email && (
        <div className="flex items-center gap-1 text-text-muted">
          <Mail className="h-3 w-3 text-text-muted" />
          {email}
        </div>
      )}
    </div>
  );
}

function VendorTaxCell({
  tin,
  tradeLicenseNo,
}: {
  tin?: string | null;
  tradeLicenseNo?: string | null;
}) {
  if (!tin && !tradeLicenseNo) return <span className="text-text-disabled text-caption">—</span>;
  return (
    <div className="space-y-0.5 text-caption text-text-muted">
      {tin && <div>TIN: {tin}</div>}
      {tradeLicenseNo && <div>TL: {tradeLicenseNo}</div>}
    </div>
  );
}

function VendorRowActions({
  vendor,
  outstandingPaisa,
  onSelect,
  onCreateBill,
  onPay,
}: {
  vendor: VendorItem;
  outstandingPaisa: bigint;
  onSelect?: (v: VendorItem) => void;
  onCreateBill?: (v: VendorItem) => void;
  onPay?: (v: VendorItem) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      {onCreateBill && (
        <IconButton
          variant="ghost"
          size="sm"
          icon={<FileText className="h-4 w-4" />}
          aria-label="Create Bill"
          title="Create Bill"
          onClick={() => onCreateBill(vendor)}
        />
      )}
      {onPay && outstandingPaisa > 0n && (
        <IconButton
          variant="ghost"
          size="sm"
          icon={<DollarSign className="h-4 w-4 text-success" />}
          aria-label="Record Payment"
          title="Record Payment"
          onClick={() => onPay(vendor)}
        />
      )}
      {onSelect && (
        <IconButton
          variant="ghost"
          size="sm"
          icon={<Eye className="h-4 w-4" />}
          aria-label="View Details"
          title="View Details"
          onClick={() => onSelect(vendor)}
        />
      )}
    </div>
  );
}

function VendorTableRow({
  vendor,
  onSelect,
  onCreateBill,
  onPay,
}: {
  vendor: VendorItem;
  onSelect?: (vendor: VendorItem) => void;
  onCreateBill?: (vendor: VendorItem) => void;
  onPay?: (vendor: VendorItem) => void;
}) {
  const outstandingPaisa = BigInt(vendor.outstandingBalancePaisa ?? '0');
  const totalBillsPaisa = BigInt(vendor.totalBillsPaisa ?? '0');

  return (
    <tr className="transition-colors hover:bg-surface-sunken/40">
      <td className="px-4 py-3">
        <div className="text-body font-semibold text-text">{vendor.name}</div>
        {vendor.contactPerson && (
          <div className="text-caption text-text-muted">Attn: {vendor.contactPerson}</div>
        )}
      </td>
      <td className="px-4 py-3">
        <VendorContactCell phone={vendor.phone} email={vendor.email} />
      </td>
      <td className="px-4 py-3">
        <VendorTaxCell tin={vendor.tin} tradeLicenseNo={vendor.tradeLicenseNo} />
      </td>
      <td className="px-4 py-3 text-right text-body font-medium text-text tabular-nums">
        {formatMoney(totalBillsPaisa)}
      </td>
      <td className="px-4 py-3 text-right">
        <span
          className={`text-body font-semibold tabular-nums ${
            outstandingPaisa > 0n ? 'text-primary' : 'text-text-muted'
          }`}
        >
          {formatMoney(outstandingPaisa)}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-caption font-semibold ${
            vendor.isActive
              ? 'border border-success/30 bg-success/10 text-success'
              : 'border border-border bg-surface-sunken text-text-muted'
          }`}
        >
          {vendor.isActive ? 'ACTIVE' : 'INACTIVE'}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <VendorRowActions
          vendor={vendor}
          outstandingPaisa={outstandingPaisa}
          onSelect={onSelect}
          onCreateBill={onCreateBill}
          onPay={onPay}
        />
      </td>
    </tr>
  );
}

export function VendorDataTable({
  vendors,
  isLoading,
  onSelectVendor,
  onCreateBill,
  onPayVendor,
}: VendorDataTableProps) {
  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-card border border-border bg-surface-sunken/40">
        <p className="text-body text-text-muted">Loading vendors...</p>
      </div>
    );
  }

  if (vendors.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface-sunken/30 p-6 text-center">
        <Building2 className="mb-2 h-8 w-8 text-text-muted" />
        <p className="text-body font-medium text-text">No vendors found</p>
        <p className="mt-1 text-caption text-text-muted">
          Add a new supplier or vendor to track accounts payable.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto card-workspace">
      <table className="w-full text-left">
        <thead className="border-b border-border bg-surface-sunken/60">
          <tr>
            <th className="px-4 py-3 text-th">Vendor / Supplier</th>
            <th className="px-4 py-3 text-th">Contact Details</th>
            <th className="px-4 py-3 text-th">TIN / Trade License</th>
            <th className="px-4 py-3 text-right text-th">Total Billed</th>
            <th className="px-4 py-3 text-right text-th">Outstanding (AP)</th>
            <th className="px-4 py-3 text-center text-th">Status</th>
            <th className="px-4 py-3 text-right text-th">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border text-body">
          {vendors.map((vendor) => (
            <VendorTableRow
              key={vendor.id}
              vendor={vendor}
              onSelect={onSelectVendor}
              onCreateBill={onCreateBill}
              onPay={onPayVendor}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
