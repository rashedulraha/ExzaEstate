import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, FormField, Input, Select, Button } from '@exzaestate/ui';
import { PermissionGate } from '@exzaestate/app-core';
import { PERMISSIONS } from '@exzaestate/shared';
import { verifyKycSchema, type VerifyKycInput } from '../schemas/customer.schema.js';

interface CustomerKycModalProps {
  customerName: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: VerifyKycInput) => Promise<void>;
  isLoading?: boolean;
}

export function CustomerKycModal({
  customerName,
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}: CustomerKycModalProps): ReactElement {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<VerifyKycInput>({
    resolver: zodResolver(verifyKycSchema),
    defaultValues: {
      status: 'VERIFIED',
      remarks: '',
    },
  });

  const handleFormSubmit = async (data: VerifyKycInput) => {
    await onSubmit(data);
    reset();
    onClose();
  };

  return (
    <PermissionGate permission={PERMISSIONS.CUSTOMER_VERIFY_KYC}>
      <Dialog
        isOpen={isOpen}
        onClose={onClose}
        title={`KYC Verification Audit: ${customerName}`}
        description="Verify citizen national identification against EC database or record rejection with justification."
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="ghost" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit(handleFormSubmit)}
              isLoading={isLoading}
            >
              Submit KYC Audit
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <FormField
            id="kyc-status"
            label="Verification Outcome"
            required
            error={errors.status?.message}
          >
            <Select
              id="kyc-status"
              value={watch('status')}
              onChange={(val) =>
                setValue('status', val as VerifyKycInput['status'], {
                  shouldValidate: true,
                })
              }
              options={[
                { label: 'Verify (Pass KYC)', value: 'VERIFIED' },
                { label: 'Reject (Fail KYC)', value: 'REJECTED' },
              ]}
            />
          </FormField>

          <FormField
            id="kyc-remarks"
            label="Mandatory Audit Remarks"
            required
            error={errors.remarks?.message}
            helperText="State the document verification date, NID portal check result, or reason for rejection."
          >
            <Input
              id="kyc-remarks"
              {...register('remarks')}
              placeholder="e.g. Smart NID verified against Election Commission database"
              aria-invalid={!!errors.remarks}
            />
          </FormField>
        </form>
      </Dialog>
    </PermissionGate>
  );
}
