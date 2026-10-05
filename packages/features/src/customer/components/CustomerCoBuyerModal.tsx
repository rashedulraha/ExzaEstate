import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, FormField, Input, Button } from '@exzaestate/ui';
import { coBuyerSchema, type CoBuyerInput } from '../schemas/customer.schema.js';

interface CustomerCoBuyerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CoBuyerInput) => Promise<void>;
  isLoading?: boolean;
}

const DEFAULT_CO_BUYER_VALUES: CoBuyerInput = {
  fullName: '',
  phone: '',
  email: '',
  nid: '',
  relation: '',
  sharePercentage: 50,
};

export function CustomerCoBuyerModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}: CustomerCoBuyerModalProps): ReactElement {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CoBuyerInput>({
    resolver: zodResolver(coBuyerSchema),
    defaultValues: DEFAULT_CO_BUYER_VALUES,
  });

  const handleFormSubmit = async (data: CoBuyerInput) => {
    await onSubmit(data);
    reset(DEFAULT_CO_BUYER_VALUES);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Add Joint Buyer (Co-Buyer)"
      description="Register an additional legal owner sharing unit title and property rights."
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit(handleFormSubmit)} isLoading={isLoading}>
            Add Co-Buyer
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField
          id="cobuyer-name"
          label="Full Legal Name"
          required
          error={errors.fullName?.message}
        >
          <Input
            id="cobuyer-name"
            {...register('fullName')}
            placeholder="e.g. Farhana Yasmin"
            aria-invalid={!!errors.fullName}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField id="cobuyer-phone" label="Phone Number" required error={errors.phone?.message}>
            <Input
              id="cobuyer-phone"
              {...register('phone')}
              placeholder="+880 1712-000000"
              aria-invalid={!!errors.phone}
            />
          </FormField>

          <FormField
            id="cobuyer-nid"
            label="National ID (NID)"
            required
            error={errors.nid?.message}
          >
            <Input
              id="cobuyer-nid"
              {...register('nid')}
              placeholder="1992123456789"
              aria-invalid={!!errors.nid}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            id="cobuyer-relation"
            label="Relation to Primary Buyer"
            required
            error={errors.relation?.message}
          >
            <Input
              id="cobuyer-relation"
              {...register('relation')}
              placeholder="e.g. Spouse / Brother"
              aria-invalid={!!errors.relation}
            />
          </FormField>

          <FormField
            id="cobuyer-share"
            label="Ownership Share (%)"
            required
            error={errors.sharePercentage?.message}
          >
            <Input
              id="cobuyer-share"
              type="number"
              {...register('sharePercentage', { valueAsNumber: true })}
              placeholder="50"
              aria-invalid={!!errors.sharePercentage}
            />
          </FormField>
        </div>
      </form>
    </Dialog>
  );
}
