import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, Button, FormField, Input } from '@exzaestate/ui';
import { quotationFormSchema, type QuotationFormInput } from '../../schemas/quotation.schema.js';
import { QuotationPricingSection, QuotationScheduleSection } from './QuotationFormSections.js';

interface QuotationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: QuotationFormInput) => Promise<void>;
  isLoading: boolean;
  initialPropertyId?: string;
  initialCustomerId?: string;
}

export function QuotationFormModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  initialPropertyId,
  initialCustomerId,
}: QuotationFormModalProps): ReactElement {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<QuotationFormInput>({
    resolver: zodResolver(quotationFormSchema),
    defaultValues: {
      propertyId: initialPropertyId ?? '',
      customerId: initialCustomerId ?? '',
      validDays: 15,
      basePricePaisa: '',
      premiumAmountPaisa: '0',
      discountPct: 0,
      discountAmountPaisa: '0',
      bookingAmountPaisa: '0',
      downPaymentPaisa: '0',
      installmentCount: 24,
      frequency: 'MONTHLY',
    },
  });

  const handleFormSubmit = async (data: QuotationFormInput) => {
    await onSubmit(data);
    reset();
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Quotation"
      description="Prepare official quotation proposal with live commercial discount validation."
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit(handleFormSubmit)} isLoading={isLoading}>
            Generate Quotation
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            id="quotation-propertyId"
            label="Property Unit ID / Code"
            required
            error={errors.propertyId?.message}
          >
            <Input
              id="quotation-propertyId"
              placeholder="Enter property unit code (e.g. FLAT-3A)..."
              {...register('propertyId')}
            />
          </FormField>

          <FormField
            id="quotation-customerId"
            label="Customer ID / Code (Optional)"
            error={errors.customerId?.message}
          >
            <Input
              id="quotation-customerId"
              placeholder="Enter customer code or ID..."
              {...register('customerId')}
            />
          </FormField>
        </div>

        <QuotationPricingSection register={register} watch={watch} errors={errors} />

        <QuotationScheduleSection
          register={register}
          watch={watch}
          setValue={setValue}
          errors={errors}
        />
      </form>
    </Dialog>
  );
}
