import { type ReactElement, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, FormField, Input } from '@exzaestate/ui';
import type { MachineFingerprint } from '@exzaestate/app-core';
import {
  createLocalCompanySchema,
  type CreateLocalCompanyInput,
} from '../schemas/first-launch.schema.js';
import { LicenseCard, EmailVerificationWidget, OrgProfileSection } from './LocalCompanySections.js';

interface LocalCompanyFormProps {
  onSubmit: (data: CreateLocalCompanyInput) => void;
  isLoading: boolean;
  machineFingerprint?: MachineFingerprint | null;
  onSendVerificationCode?: (email: string) => string;
  onVerifyCode?: (code: string) => boolean;
  isEmailVerified?: boolean;
  verificationCodeSent?: boolean;
}

export function LocalCompanyForm({
  onSubmit,
  isLoading,
  machineFingerprint,
  onSendVerificationCode,
  onVerifyCode,
  isEmailVerified = false,
  verificationCodeSent = false,
}: LocalCompanyFormProps): ReactElement {
  const [verificationInput, setVerificationInput] = useState('');
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateLocalCompanyInput>({
    resolver: zodResolver(createLocalCompanySchema),
    defaultValues: {
      licenseKey: 'EXZA-ENTERPRISE-2026-ABCD-EF01-9999',
      companyName: '',
      companyCode: 'EXZA01',
      tradeLicense: '',
      adminName: '',
      adminEmail: '',
      phone: '+8801700000000',
      adminPassword: '',
      confirmPassword: '',
    },
  });

  const emailValue = watch('adminEmail');

  const handleSendCode = () => {
    if (!emailValue || !emailValue.includes('@')) {
      setVerificationError('Please enter a valid email address first');
      return;
    }
    setVerificationError(null);
    onSendVerificationCode?.(emailValue);
  };

  const handleVerify = () => {
    if (!verificationInput.trim()) {
      setVerificationError('Enter the 6-digit code');
      return;
    }
    const ok = onVerifyCode?.(verificationInput) ?? false;
    if (!ok) {
      setVerificationError('Invalid code. Please try 202601 or check console');
    } else {
      setVerificationError(null);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <LicenseCard register={register} errors={errors} fingerprint={machineFingerprint} />

      <div className="rounded-card border border-border bg-surface p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-caption font-bold text-primary">
              2
            </span>
            <span className="text-body font-semibold text-text">
              Managing Director & Verification
            </span>
          </div>
          {isEmailVerified && (
            <span className="rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-caption font-semibold text-success">
              ✓ Verified
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            id="local-adminName"
            label="Full Name"
            required
            error={errors.adminName?.message}
          >
            <Input
              id="local-adminName"
              placeholder="e.g. Managing Director Name"
              {...register('adminName')}
            />
          </FormField>

          <FormField id="local-adminPhone" label="Phone Number" error={errors.phone?.message}>
            <Input id="local-adminPhone" placeholder="+8801700000000" {...register('phone')} />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            id="local-adminEmail"
            label="Corporate Email (Login ID)"
            required
            error={errors.adminEmail?.message}
          >
            <Input
              id="local-adminEmail"
              type="email"
              placeholder="director@company.com"
              {...register('adminEmail')}
            />
          </FormField>

          <div>
            <label className="block text-label font-medium text-text mb-1.5">
              Email Verification
            </label>
            <EmailVerificationWidget
              isEmailVerified={isEmailVerified}
              verificationCodeSent={verificationCodeSent}
              emailValue={emailValue}
              onSendCode={handleSendCode}
              onVerify={handleVerify}
              verificationInput={verificationInput}
              setVerificationInput={setVerificationInput}
              verificationError={verificationError}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              placeholder="••••••••••••"
              {...register('adminPassword')}
            />
          </FormField>

          <FormField
            id="local-confirmPassword"
            label="Confirm Password"
            required
            error={errors.confirmPassword?.message}
          >
            <Input
              id="local-confirmPassword"
              type="password"
              placeholder="••••••••••••"
              {...register('confirmPassword')}
            />
          </FormField>
        </div>
      </div>

      <OrgProfileSection register={register} errors={errors} />

      <div className="pt-2 flex justify-end">
        <Button
          type="submit"
          variant="primary"
          isLoading={isLoading}
          disabled={isLoading}
          className="w-full sm:w-auto px-6 py-2.5 font-semibold"
        >
          {isLoading ? 'Provisioning Workspace...' : 'Install & Launch Workspace →'}
        </Button>
      </div>
    </form>
  );
}
