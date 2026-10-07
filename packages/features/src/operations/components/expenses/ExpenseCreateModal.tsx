import { useState, type FormEvent } from 'react';
import { Dialog, FormField, Input, Select, Button } from '@exzaestate/ui';
import type {
  CreateExpenseInput,
  ExpenseCategoryItem,
  ExpensePaymentMethodEnum,
} from '../../schemas/operations.schema.js';

export interface ExpenseCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateExpenseInput) => Promise<unknown>;
  categories: ExpenseCategoryItem[];
  projects?: Array<{ id: string; name: string }>;
  isSubmitting?: boolean;
}

export function ExpenseCreateModal({
  isOpen,
  onClose,
  onSubmit,
  categories,
  projects = [],
  isSubmitting = false,
}: ExpenseCreateModalProps) {
  const [categoryId, setCategoryId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [costCenter, setCostCenter] = useState('');
  const [payeeName, setPayeeName] = useState('');
  const [amountTaka, setAmountTaka] = useState('');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<ExpensePaymentMethodEnum>('BANK_TRANSFER');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!categoryId) errs.categoryId = 'Category is required';
    if (!payeeName.trim()) errs.payeeName = 'Payee name is required';
    const cleanAmount = amountTaka.replace(/\D/g, '');
    if (!cleanAmount || BigInt(cleanAmount) <= 0n) {
      errs.amount = 'Amount must be greater than zero';
    }
    if (!description.trim() || description.trim().length < 3) {
      errs.description = 'Description must be at least 3 characters';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const cleanAmount = amountTaka.replace(/\D/g, '');
    const amountPaisa = (BigInt(cleanAmount) * 100n).toString();

    await onSubmit({
      categoryId,
      projectId: projectId || undefined,
      costCenter: costCenter.trim() || undefined,
      payeeName: payeeName.trim(),
      amountPaisa,
      description: description.trim(),
      paymentMethod,
      expenseDate,
    });

    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Create Expense Voucher"
      description="Record an operational expense request for verification & approval"
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={isSubmitting}
            data-testid="save-expense-voucher-btn"
          >
            Save Voucher Draft
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-text" data-testid="expense-form">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            id="expenseCategory"
            label="Expense Category"
            required
            error={errors.categoryId}
          >
            <Select
              id="expenseCategory"
              placeholder="Select category..."
              value={categoryId}
              options={categories.map((c) => ({ value: c.id, label: `${c.code} · ${c.name}` }))}
              onChange={(val) => setCategoryId(val)}
              disabled={isSubmitting}
            />
          </FormField>

          <FormField id="expenseProject" label="Project / Phase (Optional)">
            <Select
              id="expenseProject"
              placeholder="Select project..."
              value={projectId}
              options={projects.map((p) => ({ value: p.id, label: p.name }))}
              onChange={(val) => setProjectId(val)}
              disabled={isSubmitting}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField id="payeeName" label="Payee / Vendor Name" required error={errors.payeeName}>
            <Input
              id="payeeName"
              placeholder="e.g. Dhaka Power Distribution Company"
              value={payeeName}
              onChange={(e) => setPayeeName(e.target.value)}
              disabled={isSubmitting}
            />
          </FormField>

          <FormField id="amountTaka" label="Amount (BDT)" required error={errors.amount}>
            <Input
              id="amountTaka"
              placeholder="e.g. 50,000"
              value={amountTaka}
              onChange={(e) => setAmountTaka(e.target.value)}
              disabled={isSubmitting}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField id="paymentMethod" label="Payment Mode">
            <Select
              id="paymentMethod"
              value={paymentMethod}
              options={[
                { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
                { value: 'CHEQUE', label: 'Cheque' },
                { value: 'CASH', label: 'Cash in Hand' },
              ]}
              onChange={(val) => setPaymentMethod(val as ExpensePaymentMethodEnum)}
              disabled={isSubmitting}
            />
          </FormField>

          <FormField id="expenseDate" label="Expense Date" required>
            <Input
              id="expenseDate"
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              disabled={isSubmitting}
            />
          </FormField>

          <FormField id="costCenter" label="Cost Center (Optional)">
            <Input
              id="costCenter"
              placeholder="e.g. CC-SITE-01"
              value={costCenter}
              onChange={(e) => setCostCenter(e.target.value)}
              disabled={isSubmitting}
            />
          </FormField>
        </div>

        <FormField
          id="expenseDescription"
          label="Expense Purpose / Description"
          required
          error={errors.description}
        >
          <Input
            id="expenseDescription"
            placeholder="Detailed economic justification for this operational expense"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSubmitting}
          />
        </FormField>
      </form>
    </Dialog>
  );
}
