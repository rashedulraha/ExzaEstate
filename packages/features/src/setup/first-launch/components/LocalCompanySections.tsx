import type { ReactElement } from 'react';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { FormField, Input } from '@exzaestate/ui';
import type { CreateLocalCompanyInput } from '../schemas/first-launch.schema.js';
import { MasterPasswordField, ConfirmPasswordField } from './PasswordInputControls.js';

export function OrgDetailsStep({
  register,
  errors,
  isActive,
  companyName = '',
  onGenerateCode,
}: {
  register: UseFormRegister<CreateLocalCompanyInput>;
  errors: FieldErrors<CreateLocalCompanyInput>;
  isActive: boolean;
  companyName?: string;
  onGenerateCode?: () => void;
}): ReactElement {
  const hasCompanyName = Boolean(companyName && companyName.trim().length > 0);

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
          helperText={
            hasCompanyName
              ? '2–10 alphanumeric chars (used as tenant prefix)'
              : 'Enter legal company name first to activate code'
          }
        >
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <Input
                id="local-companyCode"
                placeholder={hasCompanyName ? 'e.g. NAVANA' : 'Enter company name first'}
                disabled={!hasCompanyName}
                {...register('companyCode')}
              />
            </div>
            <button
              type="button"
              disabled={!hasCompanyName}
              onClick={onGenerateCode}
              title={
                hasCompanyName
                  ? 'Auto-generate short company code'
                  : 'Enter company name first to generate code'
              }
              className={`h-10 px-3 rounded-button border text-caption font-medium shrink-0 inline-flex items-center gap-1.5 transition-all select-none ${
                hasCompanyName
                  ? 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 hover:border-primary active:bg-primary/25 cursor-pointer shadow-xs'
                  : 'border-border bg-surface-sunken/60 text-text-muted opacity-40 cursor-not-allowed'
              }`}
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
                />
              </svg>
              <span>Auto Generate</span>
            </button>
          </div>
        </FormField>
      </div>
    </div>
  );
}

export interface AdminCredentialsStepProps {
  register: UseFormRegister<CreateLocalCompanyInput>;
  errors: FieldErrors<CreateLocalCompanyInput>;
  isActive: boolean;
  adminPasswordValue?: string;
  onGeneratePassword?: () => void;
}

export function AdminCredentialsStep({
  register,
  errors,
  isActive,
  adminPasswordValue = '',
  onGeneratePassword,
}: AdminCredentialsStepProps): ReactElement {
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
            placeholder="e.g. Managing Director / Corporate Admin"
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
        <MasterPasswordField
          register={register}
          error={errors.adminPassword?.message}
          adminPasswordValue={adminPasswordValue}
          onGeneratePassword={onGeneratePassword}
        />
        <ConfirmPasswordField register={register} error={errors.confirmPassword?.message} />
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
