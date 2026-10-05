import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, FormField, Input, Button } from '@exzaestate/ui';
import { createCustomerSchema, type CreateCustomerInput } from '../schemas/customer.schema.js';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCustomerInput) => Promise<void>;
  isLoading?: boolean;
}

const DEFAULT_CUSTOMER_VALUES: CreateCustomerInput = {
  fullName: '',
  phone: '',
  email: '',
  nid: '',
  fatherName: '',
  motherName: '',
  spouseName: '',
  dateOfBirth: '',
  occupation: '',
  tin: '',
  emergencyContact: '',
  address: '',
};

export function CustomerFormModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}: CustomerFormModalProps): ReactElement {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateCustomerInput>({
    resolver: zodResolver(createCustomerSchema),
    defaultValues: DEFAULT_CUSTOMER_VALUES,
  });

  const handleFormSubmit = async (data: CreateCustomerInput) => {
    await onSubmit(data);
    reset(DEFAULT_CUSTOMER_VALUES);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Register New Customer"
      description="Create a comprehensive buyer profile for legal contracts, KYC, and bookings."
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit(handleFormSubmit)} isLoading={isLoading}>
            Create Customer
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            id="cust-fullName"
            label="Full Legal Name"
            required
            error={errors.fullName?.message}
          >
            <Input
              id="cust-fullName"
              {...register('fullName')}
              placeholder="e.g. Mohammad Anisur Rahman"
              aria-invalid={!!errors.fullName}
            />
          </FormField>

          <FormField id="cust-phone" label="Phone Number" required error={errors.phone?.message}>
            <Input
              id="cust-phone"
              {...register('phone')}
              placeholder="e.g. +880 1812-345678"
              aria-invalid={!!errors.phone}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            id="cust-nid"
            label="Bangladeshi NID"
            required
            error={errors.nid?.message}
            helperText="10, 13, or 17 digit national identification number."
          >
            <Input
              id="cust-nid"
              {...register('nid')}
              placeholder="e.g. 19851234567890123"
              aria-invalid={!!errors.nid}
            />
          </FormField>

          <FormField id="cust-email" label="Email Address (Optional)" error={errors.email?.message}>
            <Input
              id="cust-email"
              type="email"
              {...register('email')}
              placeholder="e.g. anis@example.com"
              aria-invalid={!!errors.email}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            id="cust-fatherName"
            label="Father's Name (Optional)"
            error={errors.fatherName?.message}
          >
            <Input
              id="cust-fatherName"
              {...register('fatherName')}
              placeholder="e.g. Late Abdul Karim"
              aria-invalid={!!errors.fatherName}
            />
          </FormField>

          <FormField
            id="cust-motherName"
            label="Mother's Name (Optional)"
            error={errors.motherName?.message}
          >
            <Input
              id="cust-motherName"
              {...register('motherName')}
              placeholder="e.g. Razia Begum"
              aria-invalid={!!errors.motherName}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            id="cust-occupation"
            label="Occupation / Profession (Optional)"
            error={errors.occupation?.message}
          >
            <Input
              id="cust-occupation"
              {...register('occupation')}
              placeholder="e.g. Civil Engineer / Entrepreneur"
              aria-invalid={!!errors.occupation}
            />
          </FormField>

          <FormField
            id="cust-tin"
            label="Tax Identification Number (TIN)"
            error={errors.tin?.message}
          >
            <Input
              id="cust-tin"
              {...register('tin')}
              placeholder="e.g. 123456789012"
              aria-invalid={!!errors.tin}
            />
          </FormField>
        </div>

        <FormField
          id="cust-address"
          label="Permanent / Residential Address"
          required
          error={errors.address?.message}
        >
          <Input
            id="cust-address"
            {...register('address')}
            placeholder="e.g. House 42, Road 11, Sector 4, Uttara, Dhaka"
            aria-invalid={!!errors.address}
          />
        </FormField>
      </form>
    </Dialog>
  );
}
