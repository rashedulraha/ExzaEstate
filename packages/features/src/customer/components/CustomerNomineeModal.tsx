import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, FormField, Input, Button } from '@exzaestate/ui';
import { nomineeSchema, type NomineeInput } from '../schemas/customer.schema.js';

interface CustomerNomineeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: NomineeInput) => Promise<void>;
  isLoading?: boolean;
}

const DEFAULT_NOMINEE_VALUES: NomineeInput = {
  fullName: '',
  phone: '',
  nid: '',
  relation: '',
  sharePercentage: 100,
};

export function CustomerNomineeModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}: CustomerNomineeModalProps): ReactElement {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NomineeInput>({
    resolver: zodResolver(nomineeSchema),
    defaultValues: DEFAULT_NOMINEE_VALUES,
  });

  const handleFormSubmit = async (data: NomineeInput) => {
    await onSubmit(data);
    reset(DEFAULT_NOMINEE_VALUES);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Add Nominee / Beneficiary"
      description="Register a legal successor entitled to rights in case of unforeseen demise."
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit(handleFormSubmit)} isLoading={isLoading}>
            Register Nominee
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField
          id="nominee-name"
          label="Full Legal Name"
          required
          error={errors.fullName?.message}
        >
          <Input
            id="nominee-name"
            {...register('fullName')}
            placeholder="e.g. Tanzim Rahman"
            aria-invalid={!!errors.fullName}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField id="nominee-phone" label="Phone Number" required error={errors.phone?.message}>
            <Input
              id="nominee-phone"
              {...register('phone')}
              placeholder="+880 1912-000000"
              aria-invalid={!!errors.phone}
            />
          </FormField>

          <FormField
            id="nominee-nid"
            label="National ID (NID)"
            required
            error={errors.nid?.message}
          >
            <Input
              id="nominee-nid"
              {...register('nid')}
              placeholder="1995123456789"
              aria-invalid={!!errors.nid}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            id="nominee-relation"
            label="Relationship"
            required
            error={errors.relation?.message}
          >
            <Input
              id="nominee-relation"
              {...register('relation')}
              placeholder="e.g. Son / Daughter"
              aria-invalid={!!errors.relation}
            />
          </FormField>

          <FormField
            id="nominee-share"
            label="Benefit Share (%)"
            required
            error={errors.sharePercentage?.message}
          >
            <Input
              id="nominee-share"
              type="number"
              {...register('sharePercentage', { valueAsNumber: true })}
              placeholder="100"
              aria-invalid={!!errors.sharePercentage}
            />
          </FormField>
        </div>
      </form>
    </Dialog>
  );
}
