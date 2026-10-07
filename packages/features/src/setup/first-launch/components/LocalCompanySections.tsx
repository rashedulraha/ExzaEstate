import type { ReactElement } from 'react';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { FormField, Input } from '@exzaestate/ui';
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
  const mbUuid = fingerprint?.motherboardUuid || 'Not Detected';
  const machineHash = fingerprint?.machineId
    ? `${fingerprint.machineId.slice(0, 18)}...`
    : 'Not Detected';

  return (
    <div className="rounded-card border border-border bg-surface-sunken p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-body font-semibold text-text">License & Hardware Protection</span>
        <span className="rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-caption font-semibold text-success">
          Hardware-Bound Lock Active
        </span>
      </div>

      <FormField
        id="local-licenseKey"
        label="Software Purchase License Key"
        required
        error={errors.licenseKey?.message}
        helperText="Verified key from your purchase receipt"
      >
        <Input
          id="local-licenseKey"
          placeholder="e.g. EXZA-XXXX-XXXX-XXXX-XXXX"
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
    </div>
  );
}

export function OrgDetailsStep({
  register,
  errors,
  isActive,
}: {
  register: UseFormRegister<CreateLocalCompanyInput>;
  errors: FieldErrors<CreateLocalCompanyInput>;
  isActive: boolean;
}): ReactElement {
  return (
    <div className={isActive ? 'space-y-3.5' : 'hidden'}>
      <div className="space-y-1">
        <h4 className="text-body font-semibold text-text">Organization Information</h4>
        <p className="text-caption text-text-muted">
          Configure your local enterprise tenant profile and ledger codes.
        </p>
      </div>

      <div className="space-y-3 pt-1">
        <FormField
          id="local-companyName"
          label="Legal Company Name"
          required
          error={errors.companyName?.message}
          helperText="Official real estate developer or enterprise organization name"
        >
          <Input
            id="local-companyName"
            placeholder="e.g. Navana Real Estate Ltd."
            {...register('companyName')}
            autoFocus={isActive}
          />
        </FormField>

        <FormField
          id="local-companyCode"
          label="Company Code"
          required
          error={errors.companyCode?.message}
          helperText="2–10 alphanumeric chars (used as tenant prefix)"
        >
          <Input id="local-companyCode" placeholder="e.g. NAVANA" {...register('companyCode')} />
        </FormField>
      </div>
    </div>
  );
}

export function AdminCredentialsStep({
  register,
  errors,
  isActive,
}: {
  register: UseFormRegister<CreateLocalCompanyInput>;
  errors: FieldErrors<CreateLocalCompanyInput>;
  isActive: boolean;
}): ReactElement {
  return (
    <div className={isActive ? 'space-y-3.5' : 'hidden'}>
      <div className="space-y-1">
        <h4 className="text-body font-semibold text-text">Administrator Account</h4>
        <p className="text-caption text-text-muted">
          Create the master administrator credentials for local database sign in.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <FormField
          id="local-adminName"
          label="Administrator Full Name"
          required
          error={errors.adminName?.message}
          helperText="Managing Director or Principal Admin"
        >
          <Input
            id="local-adminName"
            placeholder="e.g. Tariq Rahman"
            {...register('adminName')}
            autoFocus={isActive}
          />
        </FormField>
        <FormField
          id="local-adminEmail"
          label="Administrator Email"
          required
          error={errors.adminEmail?.message}
          helperText="Local master login identifier"
        >
          <Input
            id="local-adminEmail"
            type="email"
            placeholder="admin@organization.com"
            {...register('adminEmail')}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField
          id="local-adminPassword"
          label="Master Password"
          required
          error={errors.adminPassword?.message}
          helperText="Minimum 8 characters"
        >
          <Input
            id="local-adminPassword"
            type="password"
            placeholder="••••••••"
            {...register('adminPassword')}
          />
        </FormField>
        <FormField
          id="local-confirmPassword"
          label="Confirm Password"
          required
          error={errors.confirmPassword?.message}
          helperText="Repeat password to verify"
        >
          <Input
            id="local-confirmPassword"
            type="password"
            placeholder="••••••••"
            {...register('confirmPassword')}
          />
        </FormField>
      </div>
    </div>
  );
}

export function LicensingStep({
  register,
  errors,
  isActive,
}: {
  register: UseFormRegister<CreateLocalCompanyInput>;
  errors: FieldErrors<CreateLocalCompanyInput>;
  isActive: boolean;
}): ReactElement {
  return (
    <div className={isActive ? 'space-y-3.5' : 'hidden'}>
      <div className="space-y-1">
        <h4 className="text-body font-semibold text-text">Software Licensing</h4>
        <p className="text-caption text-text-muted">
          Bind your perpetual offline software license to this workstation.
        </p>
      </div>

      <div className="pt-1">
        <FormField
          id="local-licenseKey"
          label="Software Purchase License Key"
          required
          error={errors.licenseKey?.message}
          helperText="Enter the official license key received with your software purchase"
        >
          <Input
            id="local-licenseKey"
            placeholder="e.g. EXZA-XXXX-XXXX-XXXX-XXXX"
            {...register('licenseKey')}
            autoFocus={isActive}
          />
        </FormField>
      </div>

      <div className="p-3 rounded-card border border-border/60 bg-surface-sunken/40 flex items-center justify-between gap-3 text-caption mt-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-success shrink-0" />
          <div>
            <span className="font-semibold text-text">Single Computer Protection Active</span>
            <p className="text-caption text-text-muted">
              All company data is stored securely and privately on this PC
            </p>
          </div>
        </div>
        <span className="rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-caption font-semibold text-success shrink-0">
          Hardware-Bound Lock Active
        </span>
      </div>
    </div>
  );
}
