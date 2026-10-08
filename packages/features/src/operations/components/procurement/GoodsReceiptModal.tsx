import { useState, useEffect } from 'react';
import { formatMoney } from '@exzaestate/shared';
import { Dialog, Button, FormField, Input, Select } from '@exzaestate/ui';
import type {
  PurchaseOrderItem,
  CreateGoodsReceiptFormInput,
} from '../../schemas/procurement.schema.js';

interface GrnLineState {
  poLineId?: string;
  itemDescription: string;
  orderedQty: string;
  receivedQty: string;
  acceptedQty: string;
  rejectedQty: string;
  unit: string;
  unitPricePaisa: string;
  rejectionReason: string;
  notes: string;
}

export interface GoodsReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateGoodsReceiptFormInput) => Promise<void>;
  purchaseOrders: PurchaseOrderItem[];
  preselectedPoId?: string;
}

export function GoodsReceiptModal({
  isOpen,
  onClose,
  onSubmit,
  purchaseOrders,
  preselectedPoId,
}: GoodsReceiptModalProps) {
  const [poId, setPoId] = useState(preselectedPoId ?? '');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0] ?? '');
  const [challanNumber, setChallanNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<GrnLineState[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPo = purchaseOrders.find((p) => p.id === poId);

  useEffect(() => {
    if (preselectedPoId) setPoId(preselectedPoId);
  }, [preselectedPoId]);

  useEffect(() => {
    if (selectedPo && selectedPo.lines.length > 0) {
      setLines(
        selectedPo.lines.map((l) => {
          const ordered = parseFloat(l.quantity || '0');
          const alreadyReceived = parseFloat(l.receivedQuantity || '0');
          const remaining = Math.max(0, ordered - alreadyReceived);
          return {
            poLineId: l.id,
            itemDescription: l.itemDescription,
            orderedQty: l.quantity,
            receivedQty: remaining > 0 ? remaining.toString() : '0',
            acceptedQty: remaining > 0 ? remaining.toString() : '0',
            rejectedQty: '0',
            unit: l.unit,
            unitPricePaisa: l.unitPricePaisa,
            rejectionReason: '',
            notes: '',
          };
        }),
      );
    } else {
      setLines([]);
    }
  }, [selectedPo]);

  if (!isOpen) return null;

  const updateLine = (idx: number, field: keyof GrnLineState, val: string) => {
    setLines((prev) =>
      prev.map((l, i) => {
        if (i !== idx) return l;
        const updated = { ...l, [field]: val };
        if (field === 'receivedQty') {
          const rec = parseFloat(val || '0');
          const rej = parseFloat(updated.rejectedQty || '0');
          updated.acceptedQty = Math.max(0, rec - rej).toString();
        } else if (field === 'rejectedQty') {
          const rec = parseFloat(updated.receivedQty || '0');
          const rej = parseFloat(val || '0');
          updated.acceptedQty = Math.max(0, rec - rej).toString();
        }
        return updated;
      }),
    );
  };

  const totalAcceptedPaisa = lines.reduce((sum, l) => {
    const accQty = parseFloat(l.acceptedQty || '0');
    const unitPrice = BigInt(l.unitPricePaisa || '0');
    const linePaisa = BigInt(Math.round(accQty * Number(unitPrice)));
    return sum + linePaisa;
  }, 0n);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!poId) return setError('Please select a purchase order');
    if (lines.length === 0) return setError('No items to receive on this purchase order');
    if (lines.some((l) => parseFloat(l.receivedQty || '0') < 0)) {
      return setError('Received quantities cannot be negative');
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        poId,
        receiptDate: receiptDate || undefined,
        challanNumber: challanNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        lines: lines.map((l) => ({
          poLineId: l.poLineId,
          itemDescription: l.itemDescription,
          receivedQuantity: l.receivedQty,
          acceptedQuantity: l.acceptedQty,
          rejectedQuantity: l.rejectedQty,
          unit: l.unit,
          unitPricePaisa: l.unitPricePaisa,
          rejectionReason: l.rejectionReason.trim() || undefined,
          notes: l.notes.trim() || undefined,
        })),
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create Goods Receipt Note');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Create Goods Receipt Note (GRN)"
      description="Inspect and acknowledge delivery of materials against an active Purchase Order."
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-card border border-danger/30 bg-danger/10 p-3 text-caption text-danger">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField id="grn-po-id" label="Purchase Order (PO)" required>
            <Select
              id="grn-po-id"
              value={poId}
              onChange={(val) => setPoId(val)}
              options={[
                { label: 'Select a PO...', value: '' },
                ...purchaseOrders.map((p) => ({
                  label: `${p.poNumber} — ${p.vendor?.name || 'Vendor'}`,
                  value: p.id,
                })),
              ]}
            />
          </FormField>
          <FormField id="grn-receipt-date" label="Receipt Date">
            <Input
              id="grn-receipt-date"
              type="date"
              value={receiptDate}
              onChange={(e) => setReceiptDate(e.target.value)}
            />
          </FormField>
          <FormField id="grn-challan" label="Delivery Challan #">
            <Input
              id="grn-challan"
              value={challanNumber}
              onChange={(e) => setChallanNumber(e.target.value)}
              placeholder="e.g. CH-2026-9921"
            />
          </FormField>
        </div>
        <FormField id="grn-notes" label="Receipt Notes">
          <Input
            id="grn-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Inspection remarks / site notes"
          />
        </FormField>
        <div className="space-y-2">
          <h4 className="text-body font-semibold text-text">Inspected Materials Breakdown</h4>
          {lines.map((line, idx) => (
            <div
              key={idx}
              className="grid grid-cols-12 items-center gap-2 rounded-card border border-border bg-surface-sunken/40 p-2.5 text-caption"
            >
              <div className="col-span-4">
                <div className="font-medium text-text">{line.itemDescription}</div>
                <div className="text-text-muted">
                  Ordered: {line.orderedQty} {line.unit}
                </div>
              </div>
              <div className="col-span-2">
                <label className="text-[11px] text-text-muted">Recv Qty</label>
                <Input
                  type="number"
                  step="any"
                  value={line.receivedQty}
                  onChange={(e) => updateLine(idx, 'receivedQty', e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <label className="text-[11px] text-text-muted">Accp Qty</label>
                <Input
                  type="number"
                  step="any"
                  value={line.acceptedQty}
                  onChange={(e) => updateLine(idx, 'acceptedQty', e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <label className="text-[11px] text-text-muted">Rej Qty</label>
                <Input
                  type="number"
                  step="any"
                  value={line.rejectedQty}
                  onChange={(e) => updateLine(idx, 'rejectedQty', e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <label className="text-[11px] text-text-muted">Reason</label>
                <Input
                  value={line.rejectionReason}
                  onChange={(e) => updateLine(idx, 'rejectionReason', e.target.value)}
                  placeholder="Damage/spec"
                />
              </div>
            </div>
          ))}
          <div className="flex justify-end pt-2 text-body font-semibold text-text">
            <span>Accepted Value: </span>
            <span className="ml-2 font-mono text-primary">{formatMoney(totalAcceptedPaisa)}</span>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Acknowledge Goods Receipt
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
