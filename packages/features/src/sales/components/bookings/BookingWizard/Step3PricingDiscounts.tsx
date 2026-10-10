import { type ReactElement, useEffect } from 'react';
import type { UseFormRegister, FieldErrors, UseFormWatch, UseFormSetValue } from 'react-hook-form';
import { FormField, Input } from '@exzaestate/ui';
import { formatMoney } from '@exzaestate/shared';
import type { BookingWizardInput } from '../../../schemas/booking.schema.js';

interface Step3PricingDiscountsProps {
  register: UseFormRegister<BookingWizardInput>;
  watch: UseFormWatch<BookingWizardInput>;
  setValue: UseFormSetValue<BookingWizardInput>;
  errors: FieldErrors<BookingWizardInput>;
}

function parsePaisa(val?: string | null): bigint {
  const digits = (val ?? '').replace(/\D/g, '');
  return digits.length > 0 ? BigInt(digits) : 0n;
}

function calculateNetPrice(base?: string, premium?: string, discount?: string): string {
  const net = parsePaisa(base) + parsePaisa(premium) - parsePaisa(discount);
  return (net > 0n ? net : 0n).toString();
}

function DiscountNotice({ discountPct }: { discountPct: number }) {
  if (discountPct <= 0) return null;
  return (
    <div className="p-3 bg-warning/12 border border-warning/20 rounded-card text-caption text-warning">
      <strong>Management Approval Notice:</strong> Bookings with discounts require maker-checker
      executive sign-off before agreement issuance.
    </div>
  );
}

export function Step3PricingDiscounts({
  register,
  watch,
  setValue,
  errors,
}: Step3PricingDiscountsProps): ReactElement {
  const basePaisa = watch('basePricePaisa');
  const premiumPaisa = watch('premiumAmountPaisa');
  const discountPaisa = watch('discountAmountPaisa');
  const discountPct = Number(watch('discountPercentage') ?? 0);

  const netStr = calculateNetPrice(basePaisa, premiumPaisa, discountPaisa);

  useEffect(() => {
    setValue('netPricePaisa', netStr);
  }, [netStr, setValue]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-h3 font-semibold text-text">Step 3: Commercial Pricing & Discounts</h3>
        <p className="text-caption text-text-muted mt-0.5">
          Define commercial property valuation, special premiums, and negotiated discounts.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          id="booking-basePrice"
          label="Base Property Price (Paisa)"
          required
          error={errors.basePricePaisa?.message}
        >
          <Input
            id="booking-basePrice"
            placeholder="e.g. 500000000 (BDT 50,00,000)"
            {...register('basePricePaisa')}
          />
        </FormField>

        <FormField
          id="booking-premium"
          label="Location Premium (Paisa)"
          error={errors.premiumAmountPaisa?.message}
        >
          <Input
            id="booking-premium"
            placeholder="e.g. 20000000"
            {...register('premiumAmountPaisa')}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          id="booking-discountPct"
          label="Discount Percentage (%)"
          error={errors.discountPercentage?.message}
        >
          <Input
            id="booking-discountPct"
            type="number"
            min="0"
            max="100"
            {...register('discountPercentage', { valueAsNumber: true })}
          />
        </FormField>

        <FormField
          id="booking-discountPaisa"
          label="Discount Amount (Paisa)"
          error={errors.discountAmountPaisa?.message}
        >
          <Input
            id="booking-discountPaisa"
            placeholder="e.g. 10000000"
            {...register('discountAmountPaisa')}
          />
        </FormField>
      </div>

      <DiscountNotice discountPct={discountPct} />

      <div className="p-4 bg-surface-sunken rounded-card flex items-center justify-between border border-border">
        <span className="text-small font-semibold text-text-2">Effective Net Price:</span>
        <span className="text-h2 font-bold text-primary">{formatMoney(netStr)}</span>
      </div>
    </div>
  );
}
