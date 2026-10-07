import type { ReactElement } from 'react';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { FormField, Input } from '@exzaestate/ui';
import type { BookingWizardInput } from '../../../schemas/booking.schema.js';

interface Step4PaymentPlanProps {
  register: UseFormRegister<BookingWizardInput>;
  errors: FieldErrors<BookingWizardInput>;
}

export function Step4PaymentPlan({ register, errors }: Step4PaymentPlanProps): ReactElement {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-h3 font-semibold text-text">Step 4: Payment Terms & Hold Period</h3>
        <p className="text-caption text-text-muted mt-0.5">
          Specify initial earnest deposit, down payment, and inventory reservation lock duration.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          id="booking-bookingAmount"
          label="Booking Earnest Money (Paisa)"
          error={errors.bookingAmountPaisa?.message}
        >
          <Input
            id="booking-bookingAmount"
            placeholder="e.g. 50000000 (BDT 5,00,000)"
            {...register('bookingAmountPaisa')}
          />
        </FormField>

        <FormField
          id="booking-downPayment"
          label="Down Payment (Paisa)"
          error={errors.downPaymentPaisa?.message}
        >
          <Input
            id="booking-downPayment"
            placeholder="e.g. 100000000 (BDT 10,00,000)"
            {...register('downPaymentPaisa')}
          />
        </FormField>
      </div>

      <div className="p-4 bg-surface-sunken border border-border rounded-card space-y-3">
        <h4 className="text-h5 font-semibold text-text-muted uppercase tracking-wider">
          72-Hour Reservation Hold Window
        </h4>
        <FormField
          id="booking-holdHours"
          label="Hold Duration (Hours)"
          required
          error={errors.reservationHoldHours?.message}
        >
          <Input
            id="booking-holdHours"
            type="number"
            min="1"
            max="720"
            {...register('reservationHoldHours', { valueAsNumber: true })}
          />
        </FormField>
        <p className="text-caption text-text-muted">
          Standard policy reserves the unit for <strong>72 hours</strong>. If booking money is not
          receipted by the deadline, the reservation will lapse and return the unit to available
          status.
        </p>
      </div>
    </div>
  );
}
