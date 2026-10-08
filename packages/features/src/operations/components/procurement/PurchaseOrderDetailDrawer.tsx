import { useState } from 'react';
import { PackageCheck, XCircle, CheckCircle2, Calendar, Building2, MapPin } from 'lucide-react';
import { formatMoney } from '@exzaestate/shared';
import { Drawer, Button } from '@exzaestate/ui';
import type { PurchaseOrderItem } from '../../schemas/procurement.schema.js';
import { getPoStatusBadge } from './procurement-status.js';

export interface PurchaseOrderDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  po: PurchaseOrderItem | null;
  onCreateGrn?: (po: PurchaseOrderItem) => void;
  onCancelPo?: (id: string) => Promise<void>;
  onClosePo?: (id: string) => Promise<void>;
}

export function PurchaseOrderDetailDrawer({
  isOpen,
  onClose,
  po,
  onCreateGrn,
  onCancelPo,
  onClosePo,
}: PurchaseOrderDetailDrawerProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !po) return null;

  const handleAction = async (actionFn: () => Promise<void>) => {
    setIsProcessing(true);
    setError(null);
    try {
      await actionFn();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const canReceive =
    po.status === 'ORDERED' || po.status === 'PARTIALLY_RECEIVED' || po.status === 'DRAFT';
  const canCancel =
    (po.status === 'DRAFT' || po.status === 'ORDERED') &&
    BigInt(po.receivedAmountPaisa || '0') === 0n;
  const canClose = po.status !== 'CLOSED' && po.status !== 'CANCELLED';

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={po.poNumber}
      subtitle="Purchase Order Contract"
      size="lg"
    >
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-0.5 text-caption font-semibold ${getPoStatusBadge(
              po.status,
            )}`}
          >
            {po.status}
          </span>
        </div>

        {error && (
          <div className="rounded-card border border-danger/30 bg-danger/10 p-3 text-caption text-danger">
            {error}
          </div>
        )}

        <div className="rounded-card border border-border bg-surface-sunken/40 p-4 space-y-2">
          <div className="flex items-center gap-2 text-small text-text">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="text-text-muted">Supplier:</span>
            <span className="font-semibold">{po.vendor?.name || 'Unknown Vendor'}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-caption text-text-muted">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>Order Date: {po.orderDate}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>Expected Delivery: {po.expectedDeliveryDate || '—'}</span>
            </div>
          </div>
          {po.deliveryAddress && (
            <div className="flex items-center gap-1.5 text-caption text-text-muted">
              <MapPin className="h-3.5 w-3.5" />
              <span>Site: {po.deliveryAddress}</span>
            </div>
          )}
          {po.termsAndConditions && (
            <div className="pt-2 text-caption text-text-muted border-t border-border">
              Terms: {po.termsAndConditions}
            </div>
          )}
        </div>

        <div>
          <h4 className="mb-2 text-caption font-semibold uppercase tracking-wider text-text-muted">
            Ordered Line Items ({po.lines.length})
          </h4>
          <div className="overflow-x-auto rounded-card border border-border">
            <table className="w-full text-left">
              <thead className="border-b border-border bg-surface-sunken/60 text-th">
                <tr>
                  <th className="px-3 py-2">Item Description</th>
                  <th className="px-3 py-2 text-center">Ordered</th>
                  <th className="px-3 py-2 text-center">Received</th>
                  <th className="px-3 py-2 text-right">Unit Price</th>
                  <th className="px-3 py-2 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-caption">
                {po.lines.map((l, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 font-medium text-text">{l.itemDescription}</td>
                    <td className="px-3 py-2 text-center text-text-muted">
                      {l.quantity} {l.unit}
                    </td>
                    <td className="px-3 py-2 text-center font-medium text-accent">
                      {l.receivedQuantity || '0'} {l.unit}
                    </td>
                    <td className="px-3 py-2 text-right text-text-muted tabular-nums">
                      {formatMoney(BigInt(l.unitPricePaisa))}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-text tabular-nums">
                      {formatMoney(BigInt(l.totalAmountPaisa))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 rounded-card border border-border bg-surface-sunken/20 p-3 text-center">
            <div>
              <div className="text-caption text-text-muted">Total Order</div>
              <div className="font-semibold text-text tabular-nums">
                {formatMoney(BigInt(po.totalAmountPaisa))}
              </div>
            </div>
            <div>
              <div className="text-caption text-text-muted">Goods Received</div>
              <div className="font-semibold text-accent tabular-nums">
                {formatMoney(BigInt(po.receivedAmountPaisa))}
              </div>
            </div>
            <div>
              <div className="text-caption text-text-muted">Billed to AP</div>
              <div className="font-semibold text-success tabular-nums">
                {formatMoney(BigInt(po.billedAmountPaisa))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-border">
          {canReceive && onCreateGrn && (
            <Button
              variant="primary"
              onClick={() => {
                onClose();
                onCreateGrn(po);
              }}
              leftIcon={<PackageCheck className="h-4 w-4" />}
              className="w-full"
            >
              Receive Goods (GRN)
            </Button>
          )}
          <div className="grid grid-cols-2 gap-2">
            {canCancel && onCancelPo && (
              <Button
                variant="secondary"
                onClick={() => handleAction(() => onCancelPo(po.id))}
                disabled={isProcessing}
                leftIcon={<XCircle className="h-4 w-4 text-danger" />}
              >
                Cancel PO
              </Button>
            )}
            {canClose && onClosePo && (
              <Button
                variant="secondary"
                onClick={() => handleAction(() => onClosePo(po.id))}
                disabled={isProcessing}
                leftIcon={<CheckCircle2 className="h-4 w-4" />}
              >
                Close PO
              </Button>
            )}
          </div>
        </div>
      </div>
    </Drawer>
  );
}
