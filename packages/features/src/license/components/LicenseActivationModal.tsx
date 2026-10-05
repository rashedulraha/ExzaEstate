import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, FormField, Input, Select, Button } from '@exzaestate/ui';
import { activateLicenseSchema, type ActivateLicenseInput } from '../schemas/license.schema.js';
import type { MachineFingerprint } from '@exzaestate/app-core';

export interface LicenseActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  fingerprint: MachineFingerprint | null;
  onActivate: (data: ActivateLicenseInput) => Promise<void>;
}

const PLAN_OPTIONS = [
  { value: 'STANDARD', label: 'Standard Edition (3 Seats)' },
  { value: 'PRO', label: 'Professional Edition (10 Seats)' },
  { value: 'ENTERPRISE', label: 'Enterprise Edition (Unlimited)' },
];

function getFingerprintDetails(fingerprint: MachineFingerprint | null) {
  if (!fingerprint) {
    return {
      machineId: 'Detecting hardware identifiers...',
      motherboard: 'System',
      cpu: 'Generic',
      disk: 'Primary',
      rawMachineId: '',
    };
  }
  return {
    machineId: fingerprint.machineId,
    motherboard: fingerprint.motherboardUuid,
    cpu: fingerprint.cpuSerial,
    disk: fingerprint.diskSerial,
    rawMachineId: fingerprint.machineId,
  };
}

interface MachineFingerprintCardProps {
  fingerprint: MachineFingerprint | null;
}

function MachineFingerprintCard({ fingerprint }: MachineFingerprintCardProps) {
  const [copied, setCopied] = useState(false);
  const details = getFingerprintDetails(fingerprint);

  const handleCopy = async () => {
    if (!details.rawMachineId) return;
    try {
      await navigator.clipboard.writeText(details.rawMachineId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="bg-surface-sunken border border-border rounded-card p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-caption font-semibold text-text">Detected Workstation Machine ID</p>
          <p className="text-caption font-mono text-text-muted mt-0.5 break-all">
            {details.machineId}
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => void handleCopy()}
          disabled={!details.rawMachineId}
        >
          {copied ? 'Copied!' : 'Copy ID'}
        </Button>
      </div>
      <p className="text-caption text-text-muted mt-2 border-t border-border/40 pt-2">
        Motherboard: {details.motherboard} · CPU: {details.cpu} · Disk: {details.disk}
      </p>
    </div>
  );
}

export function LicenseActivationModal({
  isOpen,
  onClose,
  fingerprint,
  onActivate,
}: LicenseActivationModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<ActivateLicenseInput>({
    resolver: zodResolver(activateLicenseSchema),
    defaultValues: {
      companyId: '',
      licenseKey: 'EXZA-PRO-',
      plan: 'PRO',
      maxSeats: 5,
      validUntil: new Date(Date.now() + 365 * 86400 * 1000).toISOString().slice(0, 10),
      signature: '',
    },
  });

  const selectedPlan = watch('plan');

  const onSubmit = async (data: ActivateLicenseInput) => {
    try {
      setIsSubmitting(true);
      await onActivate(data);
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
      title="Activate Commercial Workstation License"
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="license-activation-form"
            variant="primary"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            Verify & Activate
          </Button>
        </div>
      }
    >
      <div className="space-y-4 py-2">
        <MachineFingerprintCard fingerprint={fingerprint} />

        <form
          id="license-activation-form"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-3"
          noValidate
        >
          <FormField
            id="companyId"
            label="Tenant Company ID"
            required
            error={errors.companyId?.message}
            helperText="Matches the company identifier in the central licensing directory"
          >
            <Input id="companyId" placeholder="e.g. comp-uuid-001" {...register('companyId')} />
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField
              id="licenseKey"
              label="License Key"
              required
              error={errors.licenseKey?.message}
            >
              <Input
                id="licenseKey"
                placeholder="EXZA-PRO-XXXX-XXXX-XXXX"
                {...register('licenseKey')}
              />
            </FormField>

            <FormField id="plan" label="Subscription Tier" required error={errors.plan?.message}>
              <Select
                id="plan"
                options={PLAN_OPTIONS}
                value={selectedPlan}
                onChange={(val) => setValue('plan', val, { shouldValidate: true })}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField
              id="maxSeats"
              label="Max Concurrent Seats"
              required
              error={errors.maxSeats?.message}
            >
              <Input
                id="maxSeats"
                type="number"
                min={1}
                {...register('maxSeats', { valueAsNumber: true })}
              />
            </FormField>

            <FormField
              id="validUntil"
              label="Valid Until (YYYY-MM-DD)"
              required
              error={errors.validUntil?.message}
            >
              <Input id="validUntil" type="date" {...register('validUntil')} />
            </FormField>
          </div>

          <FormField
            id="signature"
            label="Cryptographic Ed25519 Signature"
            required
            error={errors.signature?.message}
            helperText="Base64url digital signature issued by the licensing authority"
          >
            <Input
              id="signature"
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
