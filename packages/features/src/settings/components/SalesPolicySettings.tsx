import { useState } from 'react';
import { Button, FormField, Input, Select } from '@exzaestate/ui';

export interface SalesPolicySettingsProps {
  settings: Record<string, unknown>;
  onSave: (updated: Array<{ key: string; value: unknown }>) => Promise<unknown>;
  isSaving: boolean;
}

export function SalesPolicySettings({ settings, onSave, isSaving }: SalesPolicySettingsProps) {
  const [minBookingPct, setMinBookingPct] = useState<number>(
    Number(settings.min_booking_pct) || 10,
  );
  const [holdHours, setHoldHours] = useState<number>(Number(settings.reservation_hold_hours) || 72);
  const [approvalSla, setApprovalSla] = useState<number>(Number(settings.approval_sla_hours) || 24);
  const [freeDiscountPct, setFreeDiscountPct] = useState<number>(
    Number(settings.free_discount_limit_pct) || 0,
  );
  const [discountBase, setDiscountBase] = useState<string>(
    String(settings.discount_base || 'BASE_PLUS_PREMIUM'),
  );
  const [completionPolicy, setCompletionPolicy] = useState<string>(
    String(settings.completion_policy || 'FULLY_PAID'),
  );
  const [autoApprove, setAutoApprove] = useState<boolean>(
    Boolean(settings.single_user_auto_approve ?? true),
  );
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(false);
    await onSave([
      { key: 'min_booking_pct', value: Number(minBookingPct) },
      { key: 'reservation_hold_hours', value: Number(holdHours) },
      { key: 'approval_sla_hours', value: Number(approvalSla) },
      { key: 'free_discount_limit_pct', value: Number(freeDiscountPct) },
      { key: 'discount_base', value: discountBase },
      { key: 'completion_policy', value: completionPolicy },
      { key: 'single_user_auto_approve', value: autoApprove },
    ]);
    setSaveSuccess(true);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-card border border-border bg-surface p-6 space-y-6">
        <div>
          <h3 className="text-h3 font-semibold text-text">Booking & Hold Policy</h3>
          <p className="text-body-sm text-text-muted mt-1">
            Rules governing property booking confirmation thresholds and reservation cancellation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            label="Minimum Booking %"
            id="min-booking-pct"
            helperText="Minimum net price paid to confirm booking (AT-12, default 10%)"
          >
            <Input
              id="min-booking-pct"
              type="number"
              min={1}
              max={100}
              value={minBookingPct}
              onChange={(e) => setMinBookingPct(parseFloat(e.target.value))}
              required
            />
          </FormField>

          <FormField
            label="Reservation Hold Hours"
            id="hold-hours"
            helperText="Hours before unfunded booking auto-cancels (AT-11, default 72h)"
          >
            <Input
              id="hold-hours"
              type="number"
              min={1}
              value={holdHours}
              onChange={(e) => setHoldHours(parseInt(e.target.value, 10))}
              required
            />
          </FormField>

          <FormField
            label="Approval SLA (Hours)"
            id="sla-hours"
            helperText="Escalation threshold for pending discount approvals"
          >
            <Input
              id="sla-hours"
              type="number"
              min={1}
              value={approvalSla}
              onChange={(e) => setApprovalSla(parseInt(e.target.value, 10))}
              required
            />
          </FormField>
        </div>
      </div>

      <div className="rounded-card border border-border bg-surface p-6 space-y-6">
        <div>
          <h3 className="text-h3 font-semibold text-text">Discount & Handover Rules</h3>
          <p className="text-body-sm text-text-muted mt-1">
            Configure discount calculation basis and project completion conditions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            label="Free Discount Limit %"
            id="free-discount-pct"
            helperText="Maximum discount executive can offer without approval"
          >
            <Input
              id="free-discount-pct"
              type="number"
              min={0}
              max={100}
              value={freeDiscountPct}
              onChange={(e) => setFreeDiscountPct(parseFloat(e.target.value))}
              required
            />
          </FormField>

          <FormField
            label="Discount Base"
            id="discount-base"
            helperText="Basis on which discount is calculated"
          >
            <Select
              id="discount-base"
              value={discountBase}
              onChange={(val) => setDiscountBase(val)}
              options={[
                { value: 'BASE_PLUS_PREMIUM', label: 'Base + Premium Price' },
                { value: 'BASE_ONLY', label: 'Base Price Only' },
              ]}
            />
          </FormField>

          <FormField
            label="Completion Policy"
            id="completion-policy"
            helperText="When booking reaches COMPLETED"
          >
            <Select
              id="completion-policy"
              value={completionPolicy}
              onChange={(val) => setCompletionPolicy(val)}
              options={[
                { value: 'FULLY_PAID', label: '100% Fully Paid' },
                { value: 'POSSESSION_GIVEN', label: 'Physical Possession Given' },
                { value: 'DEED_EXECUTED', label: 'Registration Deed Executed' },
              ]}
            />
          </FormField>
        </div>

        <div className="pt-2 border-t border-border">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={autoApprove}
              onChange={(e) => setAutoApprove(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
            />
            <div>
              <span className="text-label font-medium text-text">
                Single-Operator Auto Approval
              </span>
              <p className="text-caption text-text-muted">
                Automatically approve discount requests in single-user standalone companies (AT-24).
              </p>
            </div>
          </label>
        </div>
      </div>

      <div className="flex items-center justify-between">
        {saveSuccess && (
          <p className="text-body-sm text-success font-medium">
            Sales policies updated successfully.
          </p>
        )}
        <div className="ml-auto">
          <Button type="submit" variant="primary" isLoading={isSaving}>
            Save Sales Policies
          </Button>
        </div>
      </div>
    </form>
  );
}
