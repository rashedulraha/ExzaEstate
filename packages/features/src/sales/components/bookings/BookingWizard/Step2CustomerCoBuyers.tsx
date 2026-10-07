import type { ReactElement } from 'react';
import type { UseFormRegister, FieldErrors, UseFormWatch, UseFormSetValue } from 'react-hook-form';
import { FormField, Input, Button } from '@exzaestate/ui';
import { useCustomerList } from '../../../../customer/hooks/useCustomerList.js';
import type { BookingWizardInput } from '../../../schemas/booking.schema.js';

interface Step2CustomerCoBuyersProps {
  register: UseFormRegister<BookingWizardInput>;
  watch: UseFormWatch<BookingWizardInput>;
  setValue: UseFormSetValue<BookingWizardInput>;
  errors: FieldErrors<BookingWizardInput>;
}

export function Step2CustomerCoBuyers({
  register,
  watch,
  setValue,
  errors,
}: Step2CustomerCoBuyersProps): ReactElement {
  const coBuyers = watch('coBuyers') || [];
  const { customers } = useCustomerList();

  const handleAddCoBuyer = () => {
    setValue('coBuyers', [...coBuyers, { customerId: '', customerName: '', sharePercentage: 50 }]);
  };

  const handleRemoveCoBuyer = (index: number) => {
    const updated = coBuyers.filter((_, i) => i !== index);
    setValue('coBuyers', updated);
  };

  const totalCoBuyerShare = coBuyers.reduce(
    (acc, curr) => acc + (Number(curr.sharePercentage) || 0),
    0,
  );
  const primaryShare = Math.max(0, 100 - totalCoBuyerShare);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-h3 font-semibold text-text">Step 2: Customer & Joint Co-Buyers</h3>
        <p className="text-caption text-text-muted mt-0.5">
          Designate primary buyer and configure joint ownership percentages.
        </p>
      </div>

      <div className="p-4 bg-surface-sunken/40 border border-border rounded-card space-y-4 max-w-lg">
        <h4 className="text-h5 font-semibold text-text-muted uppercase tracking-wider">
          Primary Allottee ({primaryShare}% Ownership)
        </h4>

        {customers.length > 0 && (
          <div className="space-y-1.5">
            <label
              htmlFor="select-registered-customer"
              className="text-caption font-medium text-text-muted"
            >
              Select Registered Customer (Optional)
            </label>
            <select
              id="select-registered-customer"
              value={watch('customerId') || ''}
              onChange={(e) => {
                const selected = customers.find((c) => c.id === e.target.value);
                if (selected) {
                  setValue('customerId', selected.id, { shouldValidate: true });
                  setValue('customerName', selected.fullName, { shouldValidate: true });
                }
              }}
              className="w-full h-9 px-3 rounded-button bg-surface border border-border-input text-text text-small focus:outline-none focus:ring-2 focus:ring-focus cursor-pointer"
            >
              <option value="">— Choose a registered customer —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.customerCode} · {c.fullName} ({c.phone})
                </option>
              ))}
            </select>
          </div>
        )}

        <FormField
          id="booking-customerId"
          label="Primary Customer UUID"
          required
          error={errors.customerId?.message}
        >
          <Input
            id="booking-customerId"
            placeholder="Enter customer UUID..."
            {...register('customerId')}
          />
        </FormField>

        <FormField
          id="booking-customerName"
          label="Customer Full Name (Optional)"
          error={errors.customerName?.message}
        >
          <Input
            id="booking-customerName"
            placeholder="e.g. Mohammad Rahim"
            {...register('customerName')}
          />
        </FormField>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-h5 font-semibold text-text-muted uppercase tracking-wider">
            Joint Co-Buyers ({coBuyers.length})
          </h4>
          <Button variant="secondary" size="sm" onClick={handleAddCoBuyer}>
            + Add Co-Buyer
          </Button>
        </div>

        {coBuyers.length > 0 && (
          <div className="space-y-3">
            {coBuyers.map((_, idx) => (
              <div
                key={`cobuyer-${idx}`}
                className="p-3 border border-border rounded-card bg-surface flex flex-col sm:flex-row gap-3 items-end"
              >
                <div className="flex-1">
                  <FormField id={`cobuyer-id-${idx}`} label={`Co-Buyer #${idx + 1} UUID`} required>
                    <Input
                      id={`cobuyer-id-${idx}`}
                      placeholder="Customer UUID..."
                      {...register(`coBuyers.${idx}.customerId`)}
                    />
                  </FormField>
                </div>
                <div className="w-full sm:w-32">
                  <FormField id={`cobuyer-share-${idx}`} label="Share %" required>
                    <Input
                      id={`cobuyer-share-${idx}`}
                      type="number"
                      min="1"
                      max="99"
                      {...register(`coBuyers.${idx}.sharePercentage`, { valueAsNumber: true })}
                    />
                  </FormField>
                </div>
                <Button variant="destructive" size="sm" onClick={() => handleRemoveCoBuyer(idx)}>
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}

        {totalCoBuyerShare >= 100 && (
          <div className="p-3 bg-danger/12 border border-danger/20 rounded-card text-caption text-danger">
            Co-buyer shares exceed or equal 100%. The primary customer must retain a non-zero share.
          </div>
        )}
      </div>
    </div>
  );
}
