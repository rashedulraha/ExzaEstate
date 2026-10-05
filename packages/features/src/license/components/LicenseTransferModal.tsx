import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, FormField, Input, Button } from '@exzaestate/ui';
import { transferLicenseSchema, type TransferLicenseInput } from '../schemas/license.schema.js';

export interface LicenseTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLicenseKey?: string;
  onTransfer: (data: TransferLicenseInput) => Promise<{ success: boolean; message: string }>;
}

export function LicenseTransferModal({
  isOpen,
  onClose,
  currentLicenseKey,
  onTransfer,
}: LicenseTransferModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<TransferLicenseInput>({
    resolver: zodResolver(transferLicenseSchema),
    defaultValues: {
      licenseKey: currentLicenseKey ?? '',
      reason: '',
    },
  });

  const onSubmit = async (data: TransferLicenseInput) => {
    try {
      setIsSubmitting(true);
      const res = await onTransfer(data);
      setStatusMessage(res.message);
      if (res.success) {
        setTimeout(() => {
          reset();
          setStatusMessage(null);
          onClose();
        }, 1500);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Request Hardware Transfer (Gate D-15)"
      size="md"
      footer={
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="license-transfer-form"
            variant="primary"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            Submit Transfer Request
          </Button>
        </div>
      }
    >
      <div className="space-y-4 py-2">
        <div className="bg-surface-sunken border border-border rounded-card p-3">
          <p className="text-caption font-semibold text-text">
            Hardware Binding Policy (Gate D-15)
          </p>
          <p className="text-caption text-text-muted mt-1 leading-relaxed">
            Licenses may be reassigned following motherboard, CPU, or hard drive repairs. The system
            permits up to <strong>2 transfer requests per calendar year</strong>. Component
            tolerance automatically accommodates single hardware repairs when ≥ 2 of 3 identifiers
            match.
          </p>
        </div>

        {statusMessage && (
          <div className="bg-success/12 border border-success/30 rounded-card p-3 text-caption text-success">
            {statusMessage}
          </div>
        )}

        <form
          id="license-transfer-form"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-3"
          noValidate
        >
          <FormField
            id="trans-licenseKey"
            label="License Key"
            required
            error={errors.licenseKey?.message}
          >
            <Input
              id="trans-licenseKey"
              placeholder="EXZA-PRO-XXXX-XXXX-XXXX"
              {...register('licenseKey')}
            />
          </FormField>

          <FormField
            id="trans-reason"
            label="Hardware Maintenance Reason"
            required
            error={errors.reason?.message}
            helperText="e.g. Primary SSD upgrade, motherboard replacement under warranty"
          >
            <Input
              id="trans-reason"
              placeholder="e.g. Upgraded to NVMe primary disk"
              {...register('reason')}
            />
          </FormField>
        </form>
      </div>
    </Dialog>
  );
}
