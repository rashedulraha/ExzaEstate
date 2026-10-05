import { useState } from 'react';
import { Dialog, Button, FormField, Input, Select } from '@exzaestate/ui';
import type { CreateBudgetInput, ExpenseCategoryItem } from '../../schemas/operations.schema.js';

export interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateBudgetInput) => Promise<void>;
  projects?: Array<{ id: string; name: string }>;
  categories?: ExpenseCategoryItem[];
}

export function BudgetModal({
  isOpen,
  onClose,
  onSubmit,
  projects = [],
  categories = [],
}: BudgetModalProps) {
  const [projectId, setProjectId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [fiscalYear, setFiscalYear] = useState('2026-2027');
  const [budgetTaka, setBudgetTaka] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const amountVal = parseFloat(budgetTaka);
    if (isNaN(amountVal) || amountVal <= 0) {
      setError('Please enter a valid budget amount');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        projectId: projectId || undefined,
        categoryId: categoryId || undefined,
        fiscalYear: fiscalYear.trim(),
        budgetAmountPaisa: BigInt(Math.round(amountVal * 100)).toString(),
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to allocate budget');
    } finally {
      setIsSubmitting(false);
    }
  };

  const projectOptions = [
    { label: 'General Corporate (Head Office)', value: '' },
    ...projects.map((p) => ({ label: p.name, value: p.id })),
  ];

  const categoryOptions = [
    { label: 'All Categories (Consolidated Project Budget)', value: '' },
    ...categories.map((c) => ({ label: `${c.code} - ${c.name}`, value: c.id })),
  ];

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Set Operational Budget"
      description="Define the fiscal year expenditure cap and allocation boundaries."
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => handleSubmit()} isLoading={isSubmitting}>
            Set Budget
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-danger/10 border border-danger/30 rounded-card text-caption text-danger">
            {error}
          </div>
        )}

        <FormField id="budget-project" label="Target Project">
          <Select
            id="budget-project"
            value={projectId}
            onChange={(val) => setProjectId(val)}
            options={projectOptions}
          />
        </FormField>

        <FormField id="budget-category" label="Expense Category">
          <Select
            id="budget-category"
            value={categoryId}
            onChange={(val) => setCategoryId(val)}
            options={categoryOptions}
          />
        </FormField>

        <FormField id="budget-fiscal-year" label="Fiscal Year" required>
          <Input
            id="budget-fiscal-year"
            required
            value={fiscalYear}
            onChange={(e) => setFiscalYear(e.target.value)}
            placeholder="e.g. 2026-2027"
          />
        </FormField>

        <FormField
          id="budget-amount"
          label="Budget Cap Amount (৳)"
          required
          helperText="Alerts trigger at 70% (Info), 85% (Warning), and 100% (Critical Overrun)."
        >
          <Input
            id="budget-amount"
            type="number"
            step="1"
            min="1000"
            required
            value={budgetTaka}
            onChange={(e) => setBudgetTaka(e.target.value)}
            placeholder="e.g. 5000000"
          />
        </FormField>
      </form>
    </Dialog>
  );
}
