import { Package, Eye, Receipt } from 'lucide-react';
import { formatMoney } from '@exzaestate/shared';
import { IconButton, EmptyState } from '@exzaestate/ui';
import type { GoodsReceiptItem } from '../../schemas/procurement.schema.js';
import { getGrnStatusBadge } from './procurement-status.js';

export interface GoodsReceiptDataTableProps {
  receipts: GoodsReceiptItem[];
  isLoading?: boolean;
  onSelectReceipt: (grn: GoodsReceiptItem) => void;
  onCreateBill?: (grn: GoodsReceiptItem) => void;
  onOpenCreateModal?: () => void;
}

function GoodsReceiptRowActions({
  grn,
  onSelect,
  onCreateBill,
}: {
  grn: GoodsReceiptItem;
  onSelect: (grn: GoodsReceiptItem) => void;
  onCreateBill?: (grn: GoodsReceiptItem) => void;
}) {
  const canBill = grn.status === 'RECEIVED';

  return (
    <div className="flex items-center justify-end gap-1.5">
      {canBill && onCreateBill && (
        <IconButton
          variant="ghost"
          size="sm"
          icon={<Receipt className="h-4 w-4 text-success" />}
          aria-label="Generate Vendor Bill (3-Way Match)"
          title="Generate Vendor Bill (3-Way Match)"
          onClick={() => onCreateBill(grn)}
        />
      )}
      <IconButton
        variant="ghost"
        size="sm"
        icon={<Eye className="h-4 w-4" />}
        aria-label="View GRN Details"
        title="View GRN Details"
        onClick={() => onSelect(grn)}
      />
    </div>
  );
}

function GoodsReceiptTableRow({
  grn,
  onSelect,
  onCreateBill,
}: {
  grn: GoodsReceiptItem;
  onSelect: (grn: GoodsReceiptItem) => void;
  onCreateBill?: (grn: GoodsReceiptItem) => void;
}) {
  const totalAmountPaisa = BigInt(grn.totalAmountPaisa || '0');

  return (
    <tr className="transition-colors hover:bg-surface-sunken/40">
      <td className="px-4 py-3 font-mono font-medium text-primary">{grn.grnNumber}</td>
      <td className="px-4 py-3 font-mono text-caption text-text-muted">
        {grn.purchaseOrder?.poNumber || '—'}
      </td>
      <td className="px-4 py-3">
        <div className="font-medium text-text">{grn.vendor?.name || 'Unknown Vendor'}</div>
        {grn.challanNumber && (
          <div className="text-caption text-text-muted">Challan: {grn.challanNumber}</div>
        )}
      </td>
      <td className="px-4 py-3 text-text-muted">{grn.receiptDate}</td>
      <td className="px-4 py-3 text-right font-semibold tabular-nums text-text">
        {formatMoney(totalAmountPaisa)}
      </td>
      <td className="px-4 py-3 text-center">
        <span
          className={`inline-flex rounded-full border px-2 py-0.5 text-caption font-semibold ${getGrnStatusBadge(
            grn.status,
          )}`}
        >
          {grn.status}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <GoodsReceiptRowActions grn={grn} onSelect={onSelect} onCreateBill={onCreateBill} />
      </td>
    </tr>
  );
}

export function GoodsReceiptDataTable({
  receipts,
  isLoading,
  onSelectReceipt,
  onCreateBill,
  onOpenCreateModal,
}: GoodsReceiptDataTableProps) {
  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-card border border-border bg-surface-sunken/40">
        <p className="text-body text-text-muted">Loading goods receipts...</p>
      </div>
    );
  }

  if (receipts.length === 0) {
    return (
      <EmptyState
        dashedBorder
        icon={<Package className="h-6 w-6" />}
        title="No goods receipts (GRN) found"
        description="Receive physical materials against approved Purchase Orders."
        actionLabel={onOpenCreateModal ? 'New Goods Receipt' : undefined}
        onAction={onOpenCreateModal}
      />
    );
  }

  return (
    <div className="card-workspace overflow-x-auto">
      <table className="w-full text-left">
        <thead className="border-b border-border bg-surface-sunken/60">
          <tr>
            <th className="px-4 py-3 text-th">GRN Number</th>
            <th className="px-4 py-3 text-th">PO Reference</th>
            <th className="px-4 py-3 text-th">Vendor / Challan</th>
            <th className="px-4 py-3 text-th">Receipt Date</th>
            <th className="px-4 py-3 text-right text-th">Received Value</th>
            <th className="px-4 py-3 text-center text-th">Status</th>
            <th className="px-4 py-3 text-right text-th">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border text-body">
          {receipts.map((grn) => (
            <GoodsReceiptTableRow
              key={grn.id}
              grn={grn}
              onSelect={onSelectReceipt}
              onCreateBill={onCreateBill}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
