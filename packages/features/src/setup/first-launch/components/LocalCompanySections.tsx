import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Button, FormField, Input } from '@exzaestate/ui';
import type { MachineFingerprint } from '@exzaestate/app-core';
import type { CreateLocalCompanyInput } from '../schemas/first-launch.schema.js';

export function LicenseCard({
  register,
  errors,
  fingerprint,
}: {
  register: UseFormRegister<CreateLocalCompanyInput>;
  errors: FieldErrors<CreateLocalCompanyInput>;
  fingerprint?: MachineFingerprint | null;
}) {
  const mbUuid = fingerprint?.motherboardUuid || 'MB-SYS-DETECTION-001';
  const machineHash = fingerprint?.machineId
    ? `${fingerprint.machineId.slice(0, 18)}...`
    : '8f4c2b9a7d1e3f5a8b0c4e...';

  return (
    <div className="rounded-card border border-border bg-surface-sunken p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-caption font-bold text-primary">
            1
          </span>
          <span className="text-body font-semibold text-text">License & Hardware Protection</span>
        </div>
        <span className="rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-caption font-semibold text-success">
          Hardware-Bound Lock Active
        </span>
      </div>

      <FormField
        id="local-licenseKey"
        label="Software Purchase License Key"
        required
        error={errors.licenseKey?.message}
        helperText="Verified key from your Exzazon purchase receipt"
      >
        <Input
          id="local-licenseKey"
          placeholder="EXZA-ENTERPRISE-2026-ABCD-EF01-9999"
          {...register('licenseKey')}
        />
      </FormField>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-caption">
        <div className="rounded-button border border-border bg-surface p-2.5">
          <span className="text-text-muted block text-caption">Motherboard UUID</span>
          <span className="font-mono text-text font-medium truncate block">{mbUuid}</span>
        </div>
        <div className="rounded-button border border-border bg-surface p-2.5">
          <span className="text-text-muted block text-caption">Machine Hardware Hash</span>
          <span className="font-mono text-text font-medium truncate block">{machineHash}</span>
        </div>
      </div>

      <p className="text-caption text-text-muted">
        Protected by motherboard hardware binding. If copied to another computer via flash drive,
        write operations are locked to prevent unauthorized duplication.
      </p>
    </div>
  );
}

export function EmailVerificationWidget({
  isEmailVerified,
  verificationCodeSent,
  emailValue,
  onSendCode,
  onVerify,
  verificationInput,
  setVerificationInput,
  verificationError,
}: {
  isEmailVerified: boolean;
  verificationCodeSent: boolean;
  emailValue?: string;
  onSendCode: () => void;
  onVerify: () => void;
  verificationInput: string;
  setVerificationInput: (val: string) => void;
  verificationError: string | null;
}) {
  if (isEmailVerified) {
    return (
      <div className="flex h-10 items-center rounded-button border border-success/30 bg-success/10 px-3 text-caption font-semibold text-success">
        ✓ Identity verified for {emailValue || 'Administrator'}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {!verificationCodeSent ? (
        <Button
          type="button"
          variant="secondary"
          onClick={onSendCode}
          className="w-full justify-center"
        >
          Send Verification Code
        </Button>
      ) : (
        <div className="flex gap-2">
          <Input
            id="verification-code-input"
            placeholder="6-digit code (or 202601)"
            value={verificationInput}
            onChange={(e) => setVerificationInput(e.target.value)}
            className="flex-1"
          />
          <Button type="button" variant="primary" onClick={onVerify} className="shrink-0">
            Verify
          </Button>
        </div>
      )}
      {verificationError && <p className="text-caption text-danger">{verificationError}</p>}
      {verificationCodeSent && (
        <p className="text-caption text-text-muted">
          Code dispatched. For local testing, code is{' '}
          <span className="font-semibold text-primary">202601</span>.
        </p>
      )}
    </div>
  );
}

export function OrgProfileSection({
  register,
  errors,
}: {
  register: UseFormRegister<CreateLocalCompanyInput>;
  errors: FieldErrors<CreateLocalCompanyInput>;
}) {
  return (
    <div className="rounded-card border border-border bg-surface p-4 space-y-4">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-caption font-bold text-primary">
          3
        </span>
        <span className="text-body font-semibold text-text">Enterprise Organization Profile</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          id="local-companyName"
          label="Legal Company Name"
          required
          error={errors.companyName?.message}
        >
          <Input
            id="local-companyName"
            placeholder="e.g. Exzazon Real Estate Ltd."
            {...register('companyName')}
          />
        </FormField>

        <FormField
          id="local-companyCode"
          label="Company Code (Prefix)"
          error={errors.companyCode?.message}
          helperText="Used for vouchers and invoices (e.g. EXZA)"
        >
          <Input id="local-companyCode" placeholder="EXZA01" {...register('companyCode')} />
        </FormField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          id="local-tradeLicense"
          label="Trade License / Registration Number"
          error={errors.tradeLicense?.message}
        >
          <Input
            id="local-tradeLicense"
            placeholder="TRAD/DNCC/019283/2026"
            {...register('tradeLicense')}
          />
        </FormField>

        <div className="space-y-1">
          <span className="block text-label font-medium text-text">Regional Settings</span>
          <div className="flex h-10 items-center justify-between rounded-button border border-border bg-surface-sunken px-3 text-caption text-text">
            <span>
              Currency: <strong>BDT (৳)</strong>
            </span>
            <span>
              Timezone: <strong>Dhaka (GMT+6)</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
