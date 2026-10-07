import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { formatMoney } from '@exzaestate/shared';
import { Dialog, Button, FormField, Input, Select } from '@exzaestate/ui';
import type { CreateVendorBillInput, VendorItem } from '../../schemas/operations.schema.js';

interface LineState {
  accountCode: string;
  description: string;
  amountTaka: string;
  costCenter: string;
}

export interface VendorBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateVendorBillInput) => Promise<void>;
  vendors: VendorItem[];
  preselectedVendorId?: string;
  projects?: Array<{ id: string; name: string }>;
}

export function VendorBillModal({
  isOpen,
  onClose,
  onSubmit,
  vendors,
  preselectedVendorId,
  projects = [],
}: VendorBillModalProps) {
  const [vendorId, setVendorId] = useState(preselectedVendorId ?? '');
  const [projectId, setProjectId] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0] ?? '');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [postImmediately, setPostImmediately] = useState(false);
  const [taxWithholdingTaka, setTaxWithholdingTaka] = useState('0');
  const [vatWithholdingTaka, setVatWithholdingTaka] = useState('0');
  const [lines, setLines] = useState<LineState[]>([
    { accountCode: '5101', description: '', amountTaka: '', costCenter: 'CONSTRUCTION' },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const addLine = () =>
    setLines((prev) => [
      ...prev,
      { accountCode: '5101', description: '', amountTaka: '', costCenter: 'CONSTRUCTION' },
    ]);

  const removeLine = (idx: number) => {
    if (lines.length > 1) setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateLine = (idx: number, field: keyof LineState, val: string) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: val } : l)));
  };

  const subtotalPaisa = lines.reduce((acc, l) => {
    const parsed = Math.round(parseFloat(l.amountTaka || '0') * 100);
    return acc + (isNaN(parsed) || parsed < 0 ? 0n : BigInt(parsed));
  }, 0n);

  const tdsPaisa = BigInt(Math.max(0, Math.round(parseFloat(taxWithholdingTaka || '0') * 100)));
  const vdsPaisa = BigInt(Math.max(0, Math.round(parseFloat(vatWithholdingTaka || '0') * 100)));
  const netPayablePaisa =
    subtotalPaisa >= tdsPaisa + vdsPaisa ? subtotalPaisa - tdsPaisa - vdsPaisa : 0n;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!vendorId) return setError('Please select a vendor');
    if (
      lines.some((l) => !l.description.trim() || !l.amountTaka || parseFloat(l.amountTaka) <= 0)
    ) {
      return setError('Each bill line must have a description and positive amount');
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        vendorId,
        projectId: projectId || undefined,
        billDate,
        dueDate: dueDate || undefined,
        taxWithholdingPaisa: tdsPaisa.toString(),
        vatWithholdingPaisa: vdsPaisa.toString(),
        notes: notes.trim() || undefined,
        postImmediately,
        lines: lines.map((l) => ({
          accountCode: l.accountCode,
          description: l.description.trim(),
          amountPaisa: BigInt(Math.round(parseFloat(l.amountTaka) * 100)).toString(),
          costCenter: l.costCenter || undefined,
          projectId: projectId || undefined,
        })),
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create vendor bill');
    } finally {
      setIsSubmitting(false);
    }
  };

  const vendorOptions = [
    { label: 'Select vendor...', value: '' },
    ...vendors.map((v) => ({ label: v.name, value: v.id })),
  ];

  const projectOptions = [
    { label: 'Corporate / Head Office', value: '' },
    ...projects.map((p) => ({ label: p.name, value: p.id })),
  ];

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Create Vendor Bill / Invoice"
      description="Record vendor procurement invoices, statutory TDS/VDS withholdings, and line item expense allocations."
      size="lg"
    >
      {error && (
        <div className="mb-4 rounded-card border border-danger/30 bg-danger/10 p-3 text-caption text-danger">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField id="vendor-bill-vendor" label="Vendor" required>
            <Select
              id="vendor-bill-vendor"
              value={vendorId}
              onChange={(val) => setVendorId(val)}
              options={vendorOptions}
            />
          </FormField>
          <FormField id="vendor-bill-project" label="Project Allocation">
            <Select
              id="vendor-bill-project"
              value={projectId}
              onChange={(val) => setProjectId(val)}
              options={projectOptions}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField id="vendor-bill-date" label="Bill Date" required>
            <Input
              id="vendor-bill-date"
              type="date"
              required
              value={billDate}
              onChange={(e) => setBillDate(e.target.value)}
            />
          </FormField>
          <FormField id="vendor-bill-due-date" label="Due Date">
            <Input
              id="vendor-bill-due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </FormField>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-th">Bill Line Items</span>
            <button
              type="button"
              onClick={addLine}
              className="inline-flex items-center gap-1 px-2 py-1 text-btn text-accent hover:text-accent-text cursor-pointer transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add Item
            </button>
          </div>
          <div className="space-y-2">
            {lines.map((l, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 rounded-card border border-border bg-surface-sunken/40 p-2.5"
              >
                <input
                  type="text"
                  required
                  placeholder="Item description"
                  value={l.description}
                  onChange={(e) => updateLine(idx, 'description', e.target.value)}
                  className="flex-1 rounded-button border border-border-input bg-surface px-3 py-1.5 text-body text-text placeholder:text-text-muted focus:border-focus focus:outline-none"
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="Amount (BDT)"
                  value={l.amountTaka}
                  onChange={(e) => updateLine(idx, 'amountTaka', e.target.value)}
                  className="w-32 rounded-button border border-border-input bg-surface px-3 py-1.5 text-right text-body text-text placeholder:text-text-muted focus:border-focus focus:outline-none tabular-nums"
                />
                <button
                  type="button"
                  onClick={() => removeLine(idx)}
                  disabled={lines.length <= 1}
                  className="p-1.5 text-text-muted hover:text-danger disabled:opacity-30 cursor-pointer"
                  aria-label="Remove item"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-card border border-border bg-surface-sunken/50 p-3.5">
          <h4 className="mb-2 text-th">Withholdings & Net Payable (BDT)</h4>
          <div className="grid grid-cols-2 gap-3 text-small">
            <FormField id="vendor-tax-withholding" label="TDS / Income Tax Withholding (BDT)">
              <Input
                id="vendor-tax-withholding"
                type="number"
                step="0.01"
                min="0"
                value={taxWithholdingTaka}
                onChange={(e) => setTaxWithholdingTaka(e.target.value)}
              />
            </FormField>
            <FormField id="vendor-vat-withholding" label="VDS / VAT Withholding (BDT)">
              <Input
                id="vendor-vat-withholding"
                type="number"
                step="0.01"
                min="0"
                value={vatWithholdingTaka}
                onChange={(e) => setVatWithholdingTaka(e.target.value)}
              />
            </FormField>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-2 text-small">
            <span className="text-text-muted">Gross: {formatMoney(subtotalPaisa)}</span>
            <span className="text-body font-semibold text-primary tabular-nums">
              Net Payable: {formatMoney(netPayablePaisa)}
            </span>
          </div>
        </div>

        <FormField id="vendor-bill-notes" label="Internal Notes">
          <Input
            id="vendor-bill-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Bill notes or reference..."
          />
        </FormField>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="postImmediately"
            checked={postImmediately}
            onChange={(e) => setPostImmediately(e.target.checked)}
            className="h-4 w-4 rounded-button border-border-input bg-surface text-primary focus:ring-focus"
          />
          <label htmlFor="postImmediately" className="text-body text-text">
            Post to Accounts Payable immediately upon saving
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            onClick={(e) => {
              e.preventDefault();
              handleSubmit(e);
            }}
            disabled={isSubmitting}
            isLoading={isSubmitting}
          >
            Save Vendor Bill
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
