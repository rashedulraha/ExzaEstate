import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, FormField, Input, Button } from '@exzaestate/ui';
import { renewLicenseSchema, type RenewLicenseInput } from '../schemas/license.schema.js';

export interface LicenseRenewalModalProps {
  isOpen: boolean;
  onClose: () => void;
  renewalRequestCode: string | null;
  onRenew: (data: RenewLicenseInput) => Promise<void>;
}

export function LicenseRenewalModal({
  isOpen,
  onClose,
  renewalRequestCode,
  onRenew,
}: LicenseRenewalModalProps) {
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<RenewLicenseInput>({
    resolver: zodResolver(renewLicenseSchema),
    defaultValues: {
      licenseKey: '',
      validUntil: new Date(Date.now() + 365 * 86400 * 1000).toISOString().slice(0, 10),
      signature: '',
    },
  });

  const handleCopyCode = async () => {
    if (!renewalRequestCode) return;
    try {
      await navigator.clipboard.writeText(renewalRequestCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const onSubmit = async (data: RenewLicenseInput) => {
    try {
      setIsSubmitting(true);
      await onRenew(data);
      reset();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Renew Commercial Subscription"
      size="md"
      footer={
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="license-renewal-form"
            variant="primary"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            Apply Renewal
          </Button>
        </div>
      }
    >
      <div className="space-y-4 py-2">
        <div className="bg-surface-sunken border border-border rounded-card p-3">
          <p className="text-caption font-semibold text-text">Machine Renewal Request Code</p>
          <p className="text-small text-text-muted mt-0.5">
            Provide this code to your account manager or submit on the renewal portal:
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="font-mono text-body font-semibold text-text bg-surface border border-border rounded-input px-3 py-1.5 flex-1 select-all">
              {renewalRequestCode ?? 'Generating code...'}
            </span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void handleCopyCode()}
              disabled={!renewalRequestCode}
            >
              {copied ? 'Copied!' : 'Copy Code'}
            </Button>
          </div>
        </div>

        <form
          id="license-renewal-form"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-3"
          noValidate
        >
          <FormField
            id="renew-licenseKey"
            label="Renewed License Key"
            required
            error={errors.licenseKey?.message}
          >
            <Input
              id="renew-licenseKey"
              placeholder="EXZA-PRO-XXXX-XXXX-XXXX"
              {...register('licenseKey')}
            />
          </FormField>

          <FormField
            id="renew-validUntil"
            label="New Expiration Date (YYYY-MM-DD)"
            required
            error={errors.validUntil?.message}
          >
            <Input id="renew-validUntil" type="date" {...register('validUntil')} />
          </FormField>

          <FormField
            id="renew-signature"
            label="New Cryptographic Signature"
            required
            error={errors.signature?.message}
            helperText="Issued digital signature validating extended validity"
          >
            <Input
              id="renew-signature"
              placeholder="eyJhbGciOiJFZDI1NTE5In0..."
              {...register('signature')}
              className="font-mono text-small"
            />
          </FormField>
        </form>
      </div>
    </Dialog>
  );
}
