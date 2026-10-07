import type { ReactElement } from 'react';
import type { UseFormRegister, FieldErrors, UseFormWatch, UseFormSetValue } from 'react-hook-form';
import { FormField, Input, Select } from '@exzaestate/ui';
import { formatMoney } from '@exzaestate/shared';
import type { QuotationFormInput } from '../../schemas/quotation.schema.js';

interface QuotationPricingSectionProps {
  register: UseFormRegister<QuotationFormInput>;
  watch: UseFormWatch<QuotationFormInput>;
  errors: FieldErrors<QuotationFormInput>;
}

function parseDigitsToBigInt(val?: string | null): bigint {
  const digits = (val ?? '').replace(/\D/g, '');
  return digits.length > 0 ? BigInt(digits) : 0n;
}

function computeQuotationNet(base?: string, premium?: string, discount?: string): string {
  const net =
    parseDigitsToBigInt(base) + parseDigitsToBigInt(premium) - parseDigitsToBigInt(discount);
  return net > 0n ? formatMoney(net.toString()) : 'BDT 0.00';
}

function QuotationDiscountNotice({ discountPct }: { discountPct: number }) {
  if (discountPct <= 0) return null;
  return (
    <div className="p-3 bg-warning/12 border border-warning/20 rounded-card text-caption text-warning">
      <strong>Approval Notice:</strong> Any discount percentage &gt; 0% will route this quotation to
      the approval inbox before client dispatch.
    </div>
  );
}

export function QuotationPricingSection({
  register,
  watch,
  errors,
}: QuotationPricingSectionProps): ReactElement {
  const basePaisa = watch('basePricePaisa');
  const premiumPaisa = watch('premiumAmountPaisa');
  const discountPaisa = watch('discountAmountPaisa');
  const discountPct = Number(watch('discountPct') ?? 0);

  const netFormatted = computeQuotationNet(basePaisa, premiumPaisa, discountPaisa);

  return (
    <div className="space-y-4">
      <h4 className="text-h5 font-semibold text-text-muted uppercase tracking-wider">
        Commercial Pricing & Discount
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          id="quotation-basePrice"
          label="Base Property Price (Paisa)"
          required
          error={errors.basePricePaisa?.message}
        >
          <Input
            id="quotation-basePrice"
            placeholder="e.g. 500000000 (BDT 50,00,000)"
            {...register('basePricePaisa')}
          />
        </FormField>

        <FormField
          id="quotation-premium"
          label="Location Premium (Paisa)"
          error={errors.premiumAmountPaisa?.message}
        >
          <Input
            id="quotation-premium"
            placeholder="e.g. 20000000 (BDT 2,00,000)"
            {...register('premiumAmountPaisa')}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          id="quotation-discountPct"
          label="Discount Percentage (%)"
          error={errors.discountPct?.message}
        >
          <Input
            id="quotation-discountPct"
            type="number"
            min="0"
            max="100"
            placeholder="0"
            {...register('discountPct', { valueAsNumber: true })}
          />
        </FormField>

        <FormField
          id="quotation-discountPaisa"
          label="Discount Amount (Paisa)"
          error={errors.discountAmountPaisa?.message}
        >
          <Input
            id="quotation-discountPaisa"
            placeholder="e.g. 10000000"
            {...register('discountAmountPaisa')}
          />
        </FormField>
      </div>

      <QuotationDiscountNotice discountPct={discountPct} />

      <div className="p-4 bg-surface-sunken border border-border rounded-card flex items-center justify-between">
        <span className="text-small font-medium text-text-2">Estimated Net Total:</span>
        <span className="text-h2 font-bold text-primary">{netFormatted}</span>
      </div>
    </div>
  );
}

interface QuotationScheduleSectionProps {
  register: UseFormRegister<QuotationFormInput>;
  watch: UseFormWatch<QuotationFormInput>;
  setValue: UseFormSetValue<QuotationFormInput>;
  errors: FieldErrors<QuotationFormInput>;
}

export function QuotationScheduleSection({
  register,
  watch,
  setValue,
  errors,
}: QuotationScheduleSectionProps): ReactElement {
  return (
    <div className="space-y-4">
      <h4 className="text-h5 font-semibold text-text-muted uppercase tracking-wider">
        Payment Schedule Terms
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FormField
          id="quotation-validDays"
          label="Validity (Days)"
          required
          error={errors.validDays?.message}
        >
          <Input
            id="quotation-validDays"
            type="number"
            min="1"
            max="90"
            {...register('validDays', { valueAsNumber: true })}
          />
        </FormField>

        <FormField
          id="quotation-installments"
          label="Installment Count"
          error={errors.installmentCount?.message}
        >
          <Input
            id="quotation-installments"
            type="number"
            min="1"
            max="120"
            {...register('installmentCount', { valueAsNumber: true })}
          />
        </FormField>

        <FormField
          id="quotation-frequency"
          label="Payment Frequency"
          error={errors.frequency?.message}
        >
          <Select
            id="quotation-frequency"
            value={watch('frequency')}
            onChange={(val) =>
              setValue('frequency', val as QuotationFormInput['frequency'], {
                shouldValidate: true,
              })
            }
            options={[
              { value: 'MONTHLY', label: 'Monthly' },
              { value: 'QUARTERLY', label: 'Quarterly' },
              { value: 'HALF_YEARLY', label: 'Half-Yearly' },
              { value: 'YEARLY', label: 'Yearly' },
            ]}
          />
        </FormField>
      </div>
    </div>
  );
}
