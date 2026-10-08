import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { formatMoney } from '@exzaestate/shared';
import { Dialog, Button, FormField, Input, Select } from '@exzaestate/ui';
import type { VendorItem } from '../../schemas/operations.schema.js';
import type { CreatePurchaseOrderFormInput } from '../../schemas/procurement.schema.js';

interface PoLineState {
  itemDescription: string;
  category: string;
  quantity: string;
  unit: string;
  unitPriceTaka: string;
  notes: string;
}

export interface PurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreatePurchaseOrderFormInput) => Promise<void>;
  vendors: VendorItem[];
  projects?: Array<{ id: string; name: string }>;
}

const INITIAL_LINE: PoLineState = {
  itemDescription: '',
  category: 'RAW_MATERIALS',
  quantity: '1',
  unit: 'PCS',
  unitPriceTaka: '0',
  notes: '',
};

export function PurchaseOrderModal({
  isOpen,
  onClose,
  onSubmit,
  vendors,
  projects = [],
}: PurchaseOrderModalProps) {
  const [vendorId, setVendorId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0] ?? '');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState(
    'Payment strictly upon verified site delivery and quality inspection.',
  );
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<PoLineState[]>([{ ...INITIAL_LINE }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const vendorOptions = [
    { label: 'Select a vendor...', value: '' },
    ...vendors.map((v) => ({ label: `${v.name}${v.phone ? ` (${v.phone})` : ''}`, value: v.id })),
  ];

  const projectOptions = [
    { label: 'Company-Wide / No Project', value: '' },
    ...projects.map((p) => ({ label: p.name, value: p.id })),
  ];

  const addLine = () => setLines((prev) => [...prev, { ...INITIAL_LINE }]);
  const removeLine = (idx: number) => {
    if (lines.length > 1) setLines((prev) => prev.filter((_, i) => i !== idx));
  };
  const updateLine = (idx: number, field: keyof PoLineState, val: string) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: val } : l)));
  };

  const totalAmountPaisa = lines.reduce((sum, l) => {
    const qty = parseFloat(l.quantity || '0');
    const price = parseFloat(l.unitPriceTaka || '0');
    const paisa = Math.round(qty * price * 100);
    return sum + (isNaN(paisa) || paisa < 0 ? 0n : BigInt(paisa));
  }, 0n);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!vendorId) return setError('Please select a supplier / vendor');
    if (lines.some((l) => !l.itemDescription.trim() || parseFloat(l.quantity) <= 0)) {
      return setError('Each line must have a valid item description and positive quantity');
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        vendorId,
        projectId: projectId || undefined,
        orderDate: orderDate || undefined,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        deliveryAddress: deliveryAddress.trim() || undefined,
        termsAndConditions: termsAndConditions.trim() || undefined,
        notes: notes.trim() || undefined,
        lines: lines.map((l) => ({
          itemDescription: l.itemDescription.trim(),
          category: l.category,
          quantity: l.quantity,
          unit: l.unit,
          unitPricePaisa: BigInt(Math.round(parseFloat(l.unitPriceTaka || '0') * 100)).toString(),
          notes: l.notes.trim() || undefined,
        })),
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create purchase order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Create Purchase Order (PO)"
      description="Issue a new direct purchase order contract to an approved supplier."
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-card border border-danger/30 bg-danger/10 p-3 text-caption text-danger">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField id="po-vendor" label="Supplier / Vendor" required>
            <Select
              id="po-vendor"
              value={vendorId}
              onChange={(val) => setVendorId(val)}
              options={vendorOptions}
            />
          </FormField>
          {projects.length > 0 && (
            <FormField id="po-project" label="Project / Cost Center">
              <Select
                id="po-project"
                value={projectId}
                onChange={(val) => setProjectId(val)}
                options={projectOptions}
              />
            </FormField>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField id="po-order-date" label="Order Date">
            <Input
              id="po-order-date"
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
            />
          </FormField>
          <FormField id="po-delivery-date" label="Expected Delivery Date">
            <Input
              id="po-delivery-date"
              type="date"
              value={expectedDeliveryDate}
              onChange={(e) => setExpectedDeliveryDate(e.target.value)}
            />
          </FormField>
        </div>
        <FormField id="po-delivery-address" label="Delivery Site / Address">
          <Input
            id="po-delivery-address"
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            placeholder="e.g. Project Site A, Road 11, Banani, Dhaka"
          />
        </FormField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField id="po-terms" label="Terms & Conditions">
            <Input
              id="po-terms"
              value={termsAndConditions}
              onChange={(e) => setTermsAndConditions(e.target.value)}
              placeholder="Payment & inspection terms"
            />
          </FormField>
          <FormField id="po-notes" label="Order Notes">
            <Input
              id="po-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal order remarks"
            />
          </FormField>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-body font-semibold text-text">Order Items</h4>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={addLine}
              leftIcon={<Plus className="h-3.5 w-3.5" />}
            >
              Add Item
            </Button>
          </div>
          {lines.map((line, idx) => (
            <div
              key={idx}
              className="grid grid-cols-12 items-center gap-2 rounded-card border border-border bg-surface-sunken/40 p-2.5"
            >
              <div className="col-span-4">
                <Input
                  value={line.itemDescription}
                  onChange={(e) => updateLine(idx, 'itemDescription', e.target.value)}
                  placeholder="Item Name / Specs"
                  required
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  step="any"
                  value={line.quantity}
                  onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                  placeholder="Qty"
                  required
                />
              </div>
              <div className="col-span-2">
                <Input
                  value={line.unit}
                  onChange={(e) => updateLine(idx, 'unit', e.target.value)}
                  placeholder="Unit (PCS)"
                />
              </div>
              <div className="col-span-3">
                <Input
                  type="number"
                  step="0.01"
                  value={line.unitPriceTaka}
                  onChange={(e) => updateLine(idx, 'unitPriceTaka', e.target.value)}
                  placeholder="Rate (BDT)"
                />
              </div>
              <div className="col-span-1 text-center">
                <button
                  type="button"
                  onClick={() => removeLine(idx)}
                  disabled={lines.length === 1}
                  className="rounded-button p-1 text-text-muted hover:text-danger disabled:opacity-40"
                  aria-label="Remove item"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          <div className="flex justify-end pt-2 text-body font-semibold text-text">
            <span>Total Order Amount: </span>
            <span className="ml-2 font-mono text-primary">{formatMoney(totalAmountPaisa)}</span>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Create Purchase Order
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
