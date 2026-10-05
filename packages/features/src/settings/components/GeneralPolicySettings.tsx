import { useState } from 'react';
import { Button, FormField, Input } from '@exzaestate/ui';
import type { LandUnitFactors } from '../schemas/settings.schema.js';

export interface GeneralPolicySettingsProps {
  settings: Record<string, unknown>;
  onSave: (updated: Array<{ key: string; value: unknown }>) => Promise<unknown>;
  isSaving: boolean;
}

export function GeneralPolicySettings({ settings, onSave, isSaving }: GeneralPolicySettingsProps) {
  const initialFactors = (settings.land_unit_factors as LandUnitFactors) || {
    decimal: 435.6,
    acre: 43560,
    katha: 720,
    bigha: 14400,
  };

  const [fiscalMonth, setFiscalMonth] = useState<number>(
    Number(settings.fiscal_year_start_month) || 7,
  );
  const [nightlyTime, setNightlyTime] = useState<string>(
    String(settings.nightly_job_time || '00:30'),
  );
  const [factors, setFactors] = useState<LandUnitFactors>(initialFactors);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleFactorChange = (field: keyof LandUnitFactors, val: string) => {
    const num = parseFloat(val) || 0;
    setFactors((prev) => ({ ...prev, [field]: num }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(false);
    await onSave([
      { key: 'fiscal_year_start_month', value: Number(fiscalMonth) },
      { key: 'nightly_job_time', value: nightlyTime },
      { key: 'land_unit_factors', value: factors },
    ]);
    setSaveSuccess(true);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-card border border-border bg-surface-elevated p-6 space-y-6">
        <div>
          <h3 className="text-h3 font-semibold text-text">Fiscal Year & Operating Calendar</h3>
          <p className="text-body-sm text-text-muted mt-1">
            Configure financial fiscal start and automated scheduled maintenance timings.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Fiscal Year Start Month"
            id="fiscal-month"
            helperText="Default is 7 (July) for Bangladesh standard fiscal year"
          >
            <Input
              id="fiscal-month"
              type="number"
              min={1}
              max={12}
              value={fiscalMonth}
              onChange={(e) => setFiscalMonth(parseInt(e.target.value, 10))}
              required
            />
          </FormField>

          <FormField
            label="Nightly Maintenance Job Time"
            id="nightly-time"
            helperText="Time in Asia/Dhaka for aging calculations and reminders"
          >
            <Input
              id="nightly-time"
              type="text"
              value={nightlyTime}
              onChange={(e) => setNightlyTime(e.target.value)}
              placeholder="00:30"
              required
            />
          </FormField>
        </div>
      </div>

      <div className="rounded-card border border-border bg-surface-elevated p-6 space-y-6">
        <div>
          <h3 className="text-h3 font-semibold text-text">
            Bangladeshi Land Unit Conversion Factors
          </h3>
          <p className="text-body-sm text-text-muted mt-1">
            Define square feet (sq ft) multipliers per Bangladeshi traditional unit (AT-27).
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <FormField
            label="Decimal (Shotok)"
            id="factor-decimal"
            helperText="Standard: 435.6 sq ft"
          >
            <Input
              id="factor-decimal"
              type="number"
              step="any"
              value={factors.decimal}
              onChange={(e) => handleFactorChange('decimal', e.target.value)}
              required
            />
          </FormField>

          <FormField label="Katha" id="factor-katha" helperText="Standard: 720 sq ft">
            <Input
              id="factor-katha"
              type="number"
              step="any"
              value={factors.katha}
              onChange={(e) => handleFactorChange('katha', e.target.value)}
              required
            />
          </FormField>

          <FormField label="Bigha" id="factor-bigha" helperText="Standard: 14,400 sq ft (20 Katha)">
            <Input
              id="factor-bigha"
              type="number"
              step="any"
              value={factors.bigha}
              onChange={(e) => handleFactorChange('bigha', e.target.value)}
              required
            />
          </FormField>

          <FormField
            label="Acre"
            id="factor-acre"
            helperText="Standard: 43,560 sq ft (100 Decimal)"
          >
            <Input
              id="factor-acre"
              type="number"
              step="any"
              value={factors.acre}
              onChange={(e) => handleFactorChange('acre', e.target.value)}
              required
            />
          </FormField>
        </div>
      </div>

      <div className="flex items-center justify-between">
        {saveSuccess && (
          <p className="text-body-sm text-success font-medium">Settings saved successfully.</p>
        )}
        <div className="ml-auto">
          <Button type="submit" variant="primary" isLoading={isSaving}>
            Save General Policies
          </Button>
        </div>
      </div>
    </form>
  );
}
