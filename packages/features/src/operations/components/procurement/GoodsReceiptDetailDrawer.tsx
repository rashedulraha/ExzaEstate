import { useState } from 'react';
import { Receipt, Calendar, Building2, FileCheck, CheckCircle2 } from 'lucide-react';
import { formatMoney } from '@exzaestate/shared';
import { Drawer, Button } from '@exzaestate/ui';
import type { GoodsReceiptItem } from '../../schemas/procurement.schema.js';
import { getGrnStatusBadge } from './procurement-status.js';

export interface GoodsReceiptDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  grn: GoodsReceiptItem | null;
  onCreateBill?: (grnId: string) => Promise<unknown>;
}

export function GoodsReceiptDetailDrawer({
  isOpen,
  onClose,
  grn,
  onCreateBill,
}: GoodsReceiptDetailDrawerProps) {
  const [isBilling, setIsBilling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !grn) return null;

  const handleGenerateBill = async () => {
    if (!onCreateBill) return;
    setIsBilling(true);
    setError(null);
    try {
      await onCreateBill(grn.id);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate 3-Way match bill');
    } finally {
      setIsBilling(false);
    }
  };

  const hasBills = Boolean(grn.bills && grn.bills.length > 0);
  const canBill = grn.status === 'RECEIVED' && !hasBills && Boolean(onCreateBill);

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={grn.grnNumber}
      subtitle="Goods Receipt Note (GRN)"
      size="lg"
    >
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-0.5 text-caption font-semibold ${getGrnStatusBadge(
              grn.status,
            )}`}
          >
            {grn.status}
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
            <span className="font-semibold">{grn.vendor?.name || 'Unknown Vendor'}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-caption text-text-muted">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>Receipt Date: {grn.receiptDate}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FileCheck className="h-3.5 w-3.5" />
              <span>Challan: {grn.challanNumber || 'None'}</span>
            </div>
          </div>
          <div className="text-caption text-text-muted">
            PO Reference:{' '}
            <span className="font-mono text-text">{grn.purchaseOrder?.poNumber || '—'}</span>
          </div>
          {grn.notes && (
            <div className="pt-2 text-caption text-text-muted border-t border-border">
              Notes: {grn.notes}
            </div>
          )}
        </div>

        <div>
          <h4 className="mb-2 text-caption font-semibold uppercase tracking-wider text-text-muted">
            Verified Goods ({grn.lines.length})
          </h4>
          <div className="overflow-x-auto rounded-card border border-border">
            <table className="w-full text-left">
              <thead className="border-b border-border bg-surface-sunken/60 text-th">
                <tr>
                  <th className="px-3 py-2">Item Description</th>
                  <th className="px-3 py-2 text-center">Accepted</th>
                  <th className="px-3 py-2 text-center">Rejected</th>
                  <th className="px-3 py-2 text-right">Unit Rate</th>
                  <th className="px-3 py-2 text-right">Net Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-caption">
                {grn.lines.map((l, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 font-medium text-text">
                      <div>{l.itemDescription}</div>
                      {l.rejectionReason && (
                        <div className="text-[11px] text-danger">Rej: {l.rejectionReason}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center font-medium text-success">
                      {l.acceptedQuantity} {l.unit}
                    </td>
                    <td className="px-3 py-2 text-center text-text-muted">
                      {l.rejectedQuantity || '0'} {l.unit}
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
          <div className="mt-2 flex justify-end text-body font-semibold text-text">
            <span>Accepted Total Value: </span>
            <span className="ml-2 font-mono text-primary">
              {formatMoney(BigInt(grn.totalAmountPaisa))}
            </span>
          </div>
        </div>

        {hasBills && (
          <div className="flex items-center gap-2 rounded-card border border-success/30 bg-success/10 p-3 text-caption text-success font-medium">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>3-Way Match Complete: Vendor Bill has been generated for Accounts Payable.</span>
          </div>
        )}

        {canBill && (
          <div className="pt-2 border-t border-border">
            <Button
              variant="primary"
              onClick={handleGenerateBill}
              disabled={isBilling}
              isLoading={isBilling}
              leftIcon={<Receipt className="h-4 w-4" />}
              className="w-full"
            >
              Generate Vendor Bill (3-Way Match)
            </Button>
            <p className="mt-1 text-center text-[11px] text-text-muted">
              Creates AP Bill debiting Development WIP (1210) and crediting Accounts Payable (2001)
            </p>
          </div>
        )}
      </div>
    </Drawer>
  );
}
