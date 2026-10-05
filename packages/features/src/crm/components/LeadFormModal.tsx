import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, FormField, Input, Select, Button } from '@exzaestate/ui';
import { createLeadSchema, type CreateLeadInput, LEAD_SOURCES } from '../schemas/crm.schema.js';

interface LeadFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateLeadInput) => Promise<void>;
  isLoading?: boolean;
}

const DEFAULT_LEAD_FORM: CreateLeadInput = {
  fullName: '',
  phone: '',
  email: '',
  source: 'WALK_IN',
  preferredType: '',
  budgetMinPaisa: '',
  budgetMaxPaisa: '',
  assignedToId: '',
  notes: '',
};

export function LeadFormModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}: LeadFormModalProps): ReactElement {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateLeadInput>({
    resolver: zodResolver(createLeadSchema),
    defaultValues: DEFAULT_LEAD_FORM,
  });

  const handleFormSubmit = async (data: CreateLeadInput) => {
    await onSubmit(data);
    reset(DEFAULT_LEAD_FORM);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Sales Lead"
      description="Capture prospect details, contact channels, and initial property requirements."
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit(handleFormSubmit)} isLoading={isLoading}>
            Create Lead
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            id="lead-fullName"
            label="Prospect Full Name"
            required
            error={errors.fullName?.message}
          >
            <Input
              id="lead-fullName"
              {...register('fullName')}
              placeholder="e.g. Rafiqul Islam"
              aria-invalid={!!errors.fullName}
            />
          </FormField>

          <FormField id="lead-phone" label="Phone Number" required error={errors.phone?.message}>
            <Input
              id="lead-phone"
              {...register('phone')}
              placeholder="e.g. +880 1712-345678"
              aria-invalid={!!errors.phone}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField id="lead-email" label="Email Address (Optional)" error={errors.email?.message}>
            <Input
              id="lead-email"
              type="email"
              {...register('email')}
              placeholder="e.g. rafiq@example.com"
              aria-invalid={!!errors.email}
            />
          </FormField>

          <FormField
            id="lead-source"
            label="Acquisition Source"
            required
            error={errors.source?.message}
          >
            <Select
              id="lead-source"
              value={watch('source')}
              onChange={(val) =>
                setValue('source', val as CreateLeadInput['source'], {
                  shouldValidate: true,
                })
              }
              options={LEAD_SOURCES.map((s) => ({ label: s, value: s }))}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            id="lead-budgetMin"
            label="Min Budget (Paisa, Optional)"
            error={errors.budgetMinPaisa?.message}
            helperText="e.g. 500000000 for ৳50,00,000"
          >
            <Input
              id="lead-budgetMin"
              {...register('budgetMinPaisa')}
              placeholder="500000000"
              aria-invalid={!!errors.budgetMinPaisa}
            />
          </FormField>

          <FormField
            id="lead-budgetMax"
            label="Max Budget (Paisa, Optional)"
            error={errors.budgetMaxPaisa?.message}
            helperText="e.g. 1500000000 for ৳1,50,00,000"
          >
            <Input
              id="lead-budgetMax"
              {...register('budgetMaxPaisa')}
              placeholder="1500000000"
              aria-invalid={!!errors.budgetMaxPaisa}
            />
          </FormField>
        </div>

        <FormField
          id="lead-notes"
          label="Prospect Notes / Preferences"
          error={errors.notes?.message}
        >
          <Input
            id="lead-notes"
            {...register('notes')}
            placeholder="e.g. Interested in 3BHK flat in Banani / Dhanmondi"
            aria-invalid={!!errors.notes}
          />
        </FormField>
      </form>
    </Dialog>
  );
}
