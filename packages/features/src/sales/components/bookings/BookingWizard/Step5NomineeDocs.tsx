import type { ReactElement } from 'react';
import type { UseFormRegister, FieldErrors, UseFormWatch, UseFormSetValue } from 'react-hook-form';
import { FormField, Input, Select } from '@exzaestate/ui';
import type { BookingWizardInput } from '../../../schemas/booking.schema.js';

interface Step5NomineeDocsProps {
  register: UseFormRegister<BookingWizardInput>;
  watch: UseFormWatch<BookingWizardInput>;
  setValue: UseFormSetValue<BookingWizardInput>;
  errors: FieldErrors<BookingWizardInput>;
}

export function Step5NomineeDocs({
  register,
  watch,
  setValue,
  errors,
}: Step5NomineeDocsProps): ReactElement {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-h3 font-semibold text-text">Step 5: Nominee & Legal Beneficiary</h3>
        <p className="text-caption text-text-muted mt-0.5">
          Record statutory nominee details and National ID for legal transfer rights.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          id="booking-nomineeName"
          label="Nominee Full Name"
          error={errors.nomineeName?.message}
        >
          <Input
            id="booking-nomineeName"
            placeholder="e.g. Begum Rokeya"
            {...register('nomineeName')}
          />
        </FormField>

        <FormField
          id="booking-nomineeRelation"
          label="Relationship with Allottee"
          error={errors.nomineeRelation?.message}
        >
          <Select
            id="booking-nomineeRelation"
            value={watch('nomineeRelation') ?? ''}
            onChange={(val) => setValue('nomineeRelation', val, { shouldValidate: true })}
            options={[
              { value: '', label: 'Select relationship...' },
              { value: 'SPOUSE', label: 'Spouse' },
              { value: 'SON', label: 'Son' },
              { value: 'DAUGHTER', label: 'Daughter' },
              { value: 'MOTHER', label: 'Mother' },
              { value: 'FATHER', label: 'Father' },
              { value: 'BROTHER', label: 'Brother' },
              { value: 'SISTER', label: 'Sister' },
            ]}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          id="booking-nomineeNid"
          label="Nominee National ID (NID)"
          error={errors.nomineeNid?.message}
        >
          <Input
            id="booking-nomineeNid"
            placeholder="e.g. 19852692510000001"
            {...register('nomineeNid')}
          />
        </FormField>

        <FormField
          id="booking-notes"
          label="Special Client Instructions / Notes"
          error={errors.notes?.message}
        >
          <Input
            id="booking-notes"
            placeholder="Any specific allotment remarks..."
            {...register('notes')}
          />
        </FormField>
      </div>
    </div>
  );
}
