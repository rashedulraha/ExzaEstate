import { useState } from 'react';
import { Button, FormField, Input, Select } from '@exzaestate/ui';

export interface FinancialPolicySettingsProps {
  settings: Record<string, unknown>;
  onSave: (updated: Array<{ key: string; value: unknown }>) => Promise<unknown>;
  isSaving: boolean;
}

export function FinancialPolicySettings({
  settings,
  onSave,
  isSaving,
}: FinancialPolicySettingsProps) {
  const [revenueRecognition, setRevenueRecognition] = useState<string>(
    String(settings.revenue_recognition || 'ON_BOOKING'),
  );
  const [expenseMdThreshold, setExpenseMdThreshold] = useState<number>(
    Number(settings.expense_md_threshold) || 500000,
  );
  const [journalThreshold, setJournalThreshold] = useState<number>(
    Number(settings.manual_journal_approval_threshold) || 1000000,
  );
  const [cancellationPct, setCancellationPct] = useState<number>(
    Number(settings.cancellation_deduction_pct) || 10,
  );
  const [chequePostOn, setChequePostOn] = useState<string>(
    String(settings.cheque_post_on || 'CLEARED'),
  );
  const [autoApplyAdvance, setAutoApplyAdvance] = useState<boolean>(
    Boolean(settings.auto_apply_advance ?? false),
  );
  const [vendorWithholding, setVendorWithholding] = useState<boolean>(
    Boolean(settings.vendor_withholding_enabled ?? false),
  );
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(false);
    await onSave([
      { key: 'revenue_recognition', value: revenueRecognition },
      { key: 'expense_md_threshold', value: Number(expenseMdThreshold) },
      { key: 'manual_journal_approval_threshold', value: Number(journalThreshold) },
      { key: 'cancellation_deduction_pct', value: Number(cancellationPct) },
      { key: 'cheque_post_on', value: chequePostOn },
      { key: 'auto_apply_advance', value: autoApplyAdvance },
      { key: 'vendor_withholding_enabled', value: vendorWithholding },
    ]);
    setSaveSuccess(true);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-card border border-border bg-surface p-6 space-y-6">
        <div>
          <h3 className="text-h3 font-semibold text-text">Accounting & Revenue Recognition</h3>
          <p className="text-body-sm text-text-muted mt-1">
            Determine the statutory revenue trigger milestone and cheque accounting lifecycle.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Revenue Recognition Policy"
            id="revenue-recognition"
            helperText="Milestone at which revenue journal is recognized"
          >
            <Select
              id="revenue-recognition"
              value={revenueRecognition}
              onChange={(val) => setRevenueRecognition(val)}
              options={[
                { value: 'ON_BOOKING', label: 'On Booking Confirmation (Standard)' },
                { value: 'ON_AGREEMENT', label: 'On Agreement Signed & Locked' },
                { value: 'ON_HANDOVER', label: 'On Handover & Unit Possession' },
              ]}
            />
          </FormField>

          <FormField
            label="Cheque Posting Timing"
            id="cheque-post-on"
            helperText="When receipts and accounting entries are posted for cheques"
          >
            <Select
              id="cheque-post-on"
              value={chequePostOn}
              onChange={(val) => setChequePostOn(val)}
              options={[
                { value: 'CLEARED', label: 'On Bank Clearance (Immutable Receipt on Clear)' },
                { value: 'RECEIVED', label: 'On Physical Receipt (Uncleared)' },
              ]}
            />
          </FormField>
        </div>
      </div>

      <div className="rounded-card border border-border bg-surface p-6 space-y-6">
        <div>
          <h3 className="text-h3 font-semibold text-text">Financial Approval Thresholds</h3>
          <p className="text-body-sm text-text-muted mt-1">
            Spending limits requiring Managing Director sign-off and cancellation retention.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            label="Expense MD Threshold (BDT)"
            id="expense-md-threshold"
            helperText="Expenses above this amount require MD approval"
          >
            <Input
              id="expense-md-threshold"
              type="number"
              min={0}
              value={expenseMdThreshold}
              onChange={(e) => setExpenseMdThreshold(parseFloat(e.target.value))}
              required
            />
          </FormField>

          <FormField
            label="Manual Journal Threshold (BDT)"
            id="journal-threshold"
            helperText="Manual journals above this require secondary approval"
          >
            <Input
              id="journal-threshold"
              type="number"
              min={0}
              value={journalThreshold}
              onChange={(e) => setJournalThreshold(parseFloat(e.target.value))}
              required
            />
          </FormField>

          <FormField
            label="Cancellation Deduction %"
            id="cancellation-pct"
            helperText="Percentage retained on booking cancellation"
          >
            <Input
              id="cancellation-pct"
              type="number"
              min={0}
              max={100}
              value={cancellationPct}
              onChange={(e) => setCancellationPct(parseFloat(e.target.value))}
              required
            />
          </FormField>
        </div>

        <div className="pt-2 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={autoApplyAdvance}
              onChange={(e) => setAutoApplyAdvance(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
            />
            <div>
              <span className="text-label font-medium text-text">Auto-Apply Customer Advances</span>
              <p className="text-caption text-text-muted">
                Automatically allocate unapplied customer credits to upcoming installments.
              </p>
            </div>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={vendorWithholding}
              onChange={(e) => setVendorWithholding(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
            />
            <div>
              <span className="text-label font-medium text-text">Vendor TDS/VDS Withholding</span>
              <p className="text-caption text-text-muted">
                Enable statutory withholding tax and VAT lines on vendor bill vouchers.
              </p>
            </div>
          </label>
        </div>
      </div>

      <div className="flex items-center justify-between">
        {saveSuccess && (
          <p className="text-body-sm text-success font-medium">
            Financial policies updated successfully.
          </p>
        )}
        <div className="ml-auto">
          <Button type="submit" variant="primary" isLoading={isSaving}>
            Save Financial Policies
          </Button>
        </div>
      </div>
    </form>
  );
}
