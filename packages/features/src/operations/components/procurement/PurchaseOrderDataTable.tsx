import { ShoppingCart, Eye, PackageCheck } from 'lucide-react';
import { formatMoney } from '@exzaestate/shared';
import { IconButton, EmptyState } from '@exzaestate/ui';
import type { PurchaseOrderItem } from '../../schemas/procurement.schema.js';
import { getPoStatusBadge } from './procurement-status.js';

export interface PurchaseOrderDataTableProps {
  orders: PurchaseOrderItem[];
  isLoading?: boolean;
  onSelectOrder: (po: PurchaseOrderItem) => void;
  onCreateGrn?: (po: PurchaseOrderItem) => void;
  onOpenCreateModal?: () => void;
}

function PurchaseOrderRowActions({
  po,
  onSelect,
  onCreateGrn,
}: {
  po: PurchaseOrderItem;
  onSelect: (po: PurchaseOrderItem) => void;
  onCreateGrn?: (po: PurchaseOrderItem) => void;
}) {
  const canReceive =
    po.status === 'ORDERED' || po.status === 'PARTIALLY_RECEIVED' || po.status === 'DRAFT';

  return (
    <div className="flex items-center justify-end gap-1.5">
      {canReceive && onCreateGrn && (
        <IconButton
          variant="ghost"
          size="sm"
          icon={<PackageCheck className="h-4 w-4 text-accent" />}
          aria-label="Receive Goods (GRN)"
          title="Receive Goods (GRN)"
          onClick={() => onCreateGrn(po)}
        />
      )}
      <IconButton
        variant="ghost"
        size="sm"
        icon={<Eye className="h-4 w-4" />}
        aria-label="View PO Details"
        title="View PO Details"
        onClick={() => onSelect(po)}
      />
    </div>
  );
}

function PurchaseOrderTableRow({
  po,
  onSelect,
  onCreateGrn,
}: {
  po: PurchaseOrderItem;
  onSelect: (po: PurchaseOrderItem) => void;
  onCreateGrn?: (po: PurchaseOrderItem) => void;
}) {
  const totalAmountPaisa = BigInt(po.totalAmountPaisa || '0');
  const billedAmountPaisa = BigInt(po.billedAmountPaisa || '0');

  return (
    <tr className="transition-colors hover:bg-surface-sunken/40">
      <td className="px-4 py-3 font-mono font-medium text-primary">{po.poNumber}</td>
      <td className="px-4 py-3">
        <div className="font-medium text-text">{po.vendor?.name || 'Unknown Vendor'}</div>
        {po.vendor?.vendorNumber && (
          <div className="text-caption text-text-muted">{po.vendor.vendorNumber}</div>
        )}
      </td>
      <td className="px-4 py-3 text-text-muted">{po.orderDate}</td>
      <td className="px-4 py-3 text-right font-semibold tabular-nums text-text">
        {formatMoney(totalAmountPaisa)}
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-text-muted">
        {formatMoney(billedAmountPaisa)}
      </td>
      <td className="px-4 py-3 text-center">
        <span
          className={`inline-flex rounded-full border px-2 py-0.5 text-caption font-semibold ${getPoStatusBadge(
            po.status,
          )}`}
        >
          {po.status}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <PurchaseOrderRowActions po={po} onSelect={onSelect} onCreateGrn={onCreateGrn} />
      </td>
    </tr>
  );
}

export function PurchaseOrderDataTable({
  orders,
  isLoading,
  onSelectOrder,
  onCreateGrn,
  onOpenCreateModal,
}: PurchaseOrderDataTableProps) {
  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-card border border-border bg-surface-sunken/40">
        <p className="text-body text-text-muted">Loading purchase orders...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <EmptyState
        dashedBorder
        icon={<ShoppingCart className="h-6 w-6" />}
        title="No purchase orders issued"
        description="Issue formal PO contracts to vendors to commit material purchases."
        actionLabel={onOpenCreateModal ? 'New Purchase Order' : undefined}
        onAction={onOpenCreateModal}
      />
    );
  }

  return (
    <div className="card-workspace overflow-x-auto">
      <table className="w-full text-left">
        <thead className="border-b border-border bg-surface-sunken/60">
          <tr>
            <th className="px-4 py-3 text-th">PO Number</th>
            <th className="px-4 py-3 text-th">Vendor / Supplier</th>
            <th className="px-4 py-3 text-th">Order Date</th>
            <th className="px-4 py-3 text-right text-th">Order Amount</th>
            <th className="px-4 py-3 text-right text-th">Billed (AP)</th>
            <th className="px-4 py-3 text-center text-th">Status</th>
            <th className="px-4 py-3 text-right text-th">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border text-body">
          {orders.map((po) => (
            <PurchaseOrderTableRow
              key={po.id}
              po={po}
              onSelect={onSelectOrder}
              onCreateGrn={onCreateGrn}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
