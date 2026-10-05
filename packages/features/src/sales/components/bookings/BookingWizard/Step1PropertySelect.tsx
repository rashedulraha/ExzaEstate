import type { ReactElement } from 'react';
import type { UseFormRegister, FieldErrors, UseFormSetValue } from 'react-hook-form';
import { FormField, Input } from '@exzaestate/ui';
import type { BookingWizardInput } from '../../../schemas/booking.schema.js';

interface Step1PropertySelectProps {
  register: UseFormRegister<BookingWizardInput>;
  setValue: UseFormSetValue<BookingWizardInput>;
  errors: FieldErrors<BookingWizardInput>;
}

export function Step1PropertySelect({ register, errors }: Step1PropertySelectProps): ReactElement {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-h3 font-semibold text-text">Step 1: Property Unit Selection</h3>
        <p className="text-caption text-text-muted mt-0.5">
          Select an available property unit from inventory to lock for this booking.
        </p>
      </div>

      <div className="space-y-4 max-w-lg">
        <FormField
          id="booking-propertyId"
          label="Property Unit UUID"
          required
          error={errors.propertyId?.message}
        >
          <Input
            id="booking-propertyId"
            placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
            {...register('propertyId')}
          />
        </FormField>

        <FormField
          id="booking-propertyCode"
          label="Unit Code / Reference (Optional)"
          error={errors.propertyCode?.message}
        >
          <Input
            id="booking-propertyCode"
            placeholder="e.g. APT-4B or PLOT-12"
            {...register('propertyCode')}
          />
        </FormField>
      </div>
    </div>
  );
}
