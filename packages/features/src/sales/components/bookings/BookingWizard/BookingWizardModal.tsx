import { type ReactElement, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, Button } from '@exzaestate/ui';
import { bookingWizardSchema, type BookingWizardInput } from '../../../schemas/booking.schema.js';
import { BookingWizardStepper } from './BookingWizardStepper.js';
import { Step1PropertySelect } from './Step1PropertySelect.js';
import { Step2CustomerCoBuyers } from './Step2CustomerCoBuyers.js';
import { Step3PricingDiscounts } from './Step3PricingDiscounts.js';
import { Step4PaymentPlan } from './Step4PaymentPlan.js';
import { Step5NomineeDocs } from './Step5NomineeDocs.js';
import { Step6SalesAttribution } from './Step6SalesAttribution.js';
import { Step7ReviewSubmit } from './Step7ReviewSubmit.js';

import type {
  UseFormRegister,
  UseFormWatch,
  UseFormSetValue,
  FieldErrors,
  UseFormTrigger,
} from 'react-hook-form';

interface BookingWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: BookingWizardInput) => Promise<void>;
  isLoading: boolean;
  initialPropertyId?: string;
  initialCustomerId?: string;
}

const STEP_VALIDATION_FIELDS: Record<number, (keyof BookingWizardInput)[]> = {
  1: ['propertyId'],
  2: ['customerId', 'coBuyers'],
  3: ['basePricePaisa', 'netPricePaisa'],
  4: ['reservationHoldHours'],
};

async function validateStep(
  step: number,
  trigger: UseFormTrigger<BookingWizardInput>,
): Promise<boolean> {
  const fields = STEP_VALIDATION_FIELDS[step];
  if (!fields) return true;
  return trigger(fields);
}

interface StepContentProps {
  currentStep: number;
  register: UseFormRegister<BookingWizardInput>;
  watch: UseFormWatch<BookingWizardInput>;
  setValue: UseFormSetValue<BookingWizardInput>;
  errors: FieldErrors<BookingWizardInput>;
}

function BookingWizardStepContent({
  currentStep,
  register,
  watch,
  setValue,
  errors,
}: StepContentProps): ReactElement {
  switch (currentStep) {
    case 1:
      return <Step1PropertySelect register={register} setValue={setValue} errors={errors} />;
    case 2:
      return (
        <Step2CustomerCoBuyers
          register={register}
          watch={watch}
          setValue={setValue}
          errors={errors}
        />
      );
    case 3:
      return (
        <Step3PricingDiscounts
          register={register}
          watch={watch}
          setValue={setValue}
          errors={errors}
        />
      );
    case 4:
      return <Step4PaymentPlan register={register} errors={errors} />;
    case 5:
      return (
        <Step5NomineeDocs register={register} watch={watch} setValue={setValue} errors={errors} />
      );
    case 6:
      return <Step6SalesAttribution register={register} errors={errors} />;
    case 7:
    default:
      return <Step7ReviewSubmit watch={watch} />;
  }
}

export function BookingWizardModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  initialPropertyId,
  initialCustomerId,
}: BookingWizardModalProps): ReactElement {
  const [currentStep, setCurrentStep] = useState(1);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    reset,
    formState: { errors },
  } = useForm<BookingWizardInput>({
    resolver: zodResolver(bookingWizardSchema),
    defaultValues: {
      propertyId: initialPropertyId ?? '',
      propertyCode: '',
      customerId: initialCustomerId ?? '',
      customerName: '',
      coBuyers: [],
      basePricePaisa: '',
      premiumAmountPaisa: '0',
      discountAmountPaisa: '0',
      discountPercentage: 0,
      netPricePaisa: '',
      bookingAmountPaisa: '0',
      downPaymentPaisa: '0',
      reservationHoldHours: 72,
      nomineeName: '',
      nomineeRelation: '',
      nomineeNid: '',
      notes: '',
      salesExecutiveId: '',
      brokerId: '',
      leadId: '',
      quotationId: '',
      terms: '',
    },
  });

  const handleNext = async () => {
    const isValid = await validateStep(currentStep, trigger);
    if (isValid && currentStep < 7) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleFinalSubmit = async (data: BookingWizardInput) => {
    await onSubmit(data);
    reset();
    setCurrentStep(1);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Property Allotment & Booking Wizard"
      description="7-Step streamlined booking journey with atomic reservation guarantee."
      size="xl"
      footer={
        <div className="flex justify-between items-center w-full">
          <div>
            {currentStep > 1 && (
              <Button variant="secondary" onClick={handleBack} disabled={isLoading}>
                ← Back
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            {currentStep < 7 ? (
              <Button variant="primary" onClick={handleNext}>
                Continue →
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleSubmit(handleFinalSubmit)}
                isLoading={isLoading}
              >
                Confirm & Lock Allotment
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="-mt-4 -mx-6 mb-6">
        <BookingWizardStepper currentStep={currentStep} onStepClick={(s) => setCurrentStep(s)} />
      </div>

      <div className="min-h-[360px] py-2">
        <BookingWizardStepContent
          currentStep={currentStep}
          register={register}
          watch={watch}
          setValue={setValue}
          errors={errors}
        />
      </div>
    </Dialog>
  );
}
