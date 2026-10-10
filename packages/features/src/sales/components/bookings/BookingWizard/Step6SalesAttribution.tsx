import type { ReactElement } from 'react';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { FormField, Input } from '@exzaestate/ui';
import type { BookingWizardInput } from '../../../schemas/booking.schema.js';

interface Step6SalesAttributionProps {
  register: UseFormRegister<BookingWizardInput>;
  errors: FieldErrors<BookingWizardInput>;
}

export function Step6SalesAttribution({
  register,
  errors,
}: Step6SalesAttributionProps): ReactElement {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-h3 font-semibold text-text">
          Step 6: Sales Attribution & Lead Tracking
        </h3>
        <p className="text-caption text-text-muted mt-0.5">
          Assign sales representative commission and track originating lead and referral sources.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          id="booking-salesExec"
          label="Sales Executive ID / Reference"
          error={errors.salesExecutiveId?.message}
        >
          <Input
            id="booking-salesExec"
            placeholder="Executive ID or code..."
            {...register('salesExecutiveId')}
          />
        </FormField>

        <FormField
          id="booking-broker"
          label="Broker / Channel Partner (Optional)"
          error={errors.brokerId?.message}
        >
          <Input
            id="booking-broker"
            placeholder="Partner code or ID..."
            {...register('brokerId')}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          id="booking-leadId"
          label="Originating Lead Reference (Optional)"
          error={errors.leadId?.message}
        >
          <Input
            id="booking-leadId"
            placeholder="CRM lead reference or phone..."
            {...register('leadId')}
          />
        </FormField>

        <FormField
          id="booking-quotationId"
          label="Associated Quotation # (Optional)"
          error={errors.quotationId?.message}
        >
          <Input
            id="booking-quotationId"
            placeholder="Quotation reference or #..."
            {...register('quotationId')}
          />
        </FormField>
      </div>
    </div>
  );
}
