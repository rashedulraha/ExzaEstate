import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { formatMoney } from '@exzaestate/shared';
import { Dialog, Button, FormField, Input, Select } from '@exzaestate/ui';
import type { CreatePurchaseRequestFormInput } from '../../schemas/procurement.schema.js';

interface PrLineState {
  itemDescription: string;
  category: string;
  quantity: string;
  unit: string;
  unitPriceTaka: string;
  notes: string;
}

export interface PurchaseRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreatePurchaseRequestFormInput) => Promise<void>;
  projects?: Array<{ id: string; name: string }>;
}

const INITIAL_LINE: PrLineState = {
  itemDescription: '',
  category: 'RAW_MATERIALS',
  quantity: '1',
  unit: 'PCS',
  unitPriceTaka: '0',
  notes: '',
};

const PRIORITY_OPTIONS = [
  { label: 'Low', value: 'LOW' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'High', value: 'HIGH' },
  { label: 'Urgent', value: 'URGENT' },
];

export function PurchaseRequestModal({
  isOpen,
  onClose,
  onSubmit,
  projects = [],
}: PurchaseRequestModalProps) {
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('Procurement');
  const [projectId, setProjectId] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [requiredDate, setRequiredDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<PrLineState[]>([{ ...INITIAL_LINE }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const addLine = () => setLines((prev) => [...prev, { ...INITIAL_LINE }]);
  const removeLine = (idx: number) => {
    if (lines.length > 1) setLines((prev) => prev.filter((_, i) => i !== idx));
  };
  const updateLine = (idx: number, field: keyof PrLineState, val: string) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: val } : l)));
  };

  const totalEstimatedPaisa = lines.reduce((sum, l) => {
    const qty = parseFloat(l.quantity || '0');
    const price = parseFloat(l.unitPriceTaka || '0');
    const paisa = Math.round(qty * price * 100);
    return sum + (isNaN(paisa) || paisa < 0 ? 0n : BigInt(paisa));
  }, 0n);

  const projectOptions = [
    { label: 'No Project Assigned', value: '' },
    ...projects.map((p) => ({ label: p.name, value: p.id })),
  ];

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) return setError('Please enter a requisition title');
    if (lines.some((l) => !l.itemDescription.trim() || parseFloat(l.quantity) <= 0)) {
      return setError('Each line must have a valid item description and positive quantity');
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        title: title.trim(),
        department: department.trim() || undefined,
        projectId: projectId || undefined,
        priority,
        requiredDate: requiredDate || undefined,
        notes: notes.trim() || undefined,
        lines: lines.map((l) => ({
          itemDescription: l.itemDescription.trim(),
          category: l.category,
          quantity: l.quantity,
          unit: l.unit,
          estimatedUnitPricePaisa: BigInt(
            Math.round(parseFloat(l.unitPriceTaka || '0') * 100),
          ).toString(),
          notes: l.notes.trim() || undefined,
        })),
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create purchase request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Create Purchase Request (PR)"
      description="Create a material requisition for project or branch procurement approval."
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-card border border-danger/30 bg-danger/10 p-3 text-caption text-danger">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField id="pr-title" label="Requisition Title" required>
            <Input
              id="pr-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 500 Bags OPC Cement for Tower 1"
              required
            />
          </FormField>
          <FormField id="pr-dept" label="Department">
            <Input
              id="pr-dept"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. Civil Construction"
            />
          </FormField>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField id="pr-priority" label="Priority">
            <Select
              id="pr-priority"
              value={priority}
              onChange={(val) => setPriority(val as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT')}
              options={PRIORITY_OPTIONS}
            />
          </FormField>
          <FormField id="pr-required-date" label="Required Date">
            <Input
              id="pr-required-date"
              type="date"
              value={requiredDate}
              onChange={(e) => setRequiredDate(e.target.value)}
            />
          </FormField>
          {projects.length > 0 && (
            <FormField id="pr-project" label="Project / Site">
              <Select
                id="pr-project"
                value={projectId}
                onChange={(val) => setProjectId(val)}
                options={projectOptions}
              />
            </FormField>
          )}
        </div>
        <FormField id="pr-notes" label="Requisition Notes">
          <Input
            id="pr-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Remarks / justification / special instructions"
          />
        </FormField>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-body font-semibold text-text">Requisition Line Items</h4>
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
                  placeholder="Unit (PCS/BAG)"
                />
              </div>
              <div className="col-span-3">
                <Input
                  type="number"
                  step="0.01"
                  value={line.unitPriceTaka}
                  onChange={(e) => updateLine(idx, 'unitPriceTaka', e.target.value)}
                  placeholder="Est. Rate (BDT)"
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
            <span>Estimated Total: </span>
            <span className="ml-2 font-mono text-primary">{formatMoney(totalEstimatedPaisa)}</span>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Create Requisition
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
