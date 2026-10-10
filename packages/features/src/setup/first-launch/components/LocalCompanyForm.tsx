import { type ReactElement, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { MachineFingerprint } from '@exzaestate/app-core';
import {
  createLocalCompanySchema,
  type CreateLocalCompanyInput,
} from '../schemas/first-launch.schema.js';
import { generateCompanyCode, generateStrongPassword } from './LocalCompanyForm.helpers.js';
import { OrgDetailsStep, AdminCredentialsStep, LicensingStep } from './LocalCompanySections.js';
import { StepIndicatorBar, LocalFormFooterActions } from './LocalCompanyControls.js';

interface LocalCompanyFormProps {
  onSubmit: (data: CreateLocalCompanyInput) => void;
  isLoading: boolean;
  machineFingerprint?: MachineFingerprint | null;
  onBack?: () => void;
  // Retained optional props for test compatibility
  onSendVerificationCode?: (email: string) => string;
  onVerifyCode?: (code: string) => boolean;
  isEmailVerified?: boolean;
  verificationCodeSent?: boolean;
}

export function LocalCompanyForm({
  onSubmit,
  isLoading,
  machineFingerprint: _machineFingerprint,
  onBack,
}: LocalCompanyFormProps): ReactElement {
  const [subStep, setSubStep] = useState<1 | 2 | 3>(1);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateLocalCompanyInput>({
    resolver: zodResolver(createLocalCompanySchema),
    defaultValues: {
      companyName: '',
      companyCode: '',
      adminName: '',
      adminEmail: '',
      adminPassword: '',
      confirmPassword: '',
      licenseKey: '',
    },
  });

  const companyNameValue = watch('companyName');
  const adminPasswordValue = watch('adminPassword');
  const [generateVariant, setGenerateVariant] = useState(0);

  const handleGenerateCode = () => {
    const code = generateCompanyCode(companyNameValue, generateVariant);
    setValue('companyCode', code, { shouldValidate: true, shouldDirty: true });
    setGenerateVariant((prev) => prev + 1);
  };

  const handleGeneratePassword = () => {
    const pwd = generateStrongPassword(12);
    setValue('adminPassword', pwd, { shouldValidate: true, shouldDirty: true });
    setValue('confirmPassword', pwd, { shouldValidate: true, shouldDirty: true });
  };

  const handleNextToAdmin = async () => {
    const isValid = await trigger(['companyName', 'companyCode']);
    if (isValid) setSubStep(2);
  };

  const handleNextToLicense = async () => {
    const isValid = await trigger(['adminName', 'adminEmail', 'adminPassword', 'confirmPassword']);
    if (isValid) setSubStep(3);
  };

  const handleGoToStep3 = async () => {
    const valid1 = await trigger(['companyName', 'companyCode']);
    const valid2 = await trigger(['adminName', 'adminEmail', 'adminPassword', 'confirmPassword']);
    if (valid1 && valid2) setSubStep(3);
  };

  const handleFormError = () => {
    if (errors.companyName || errors.companyCode) {
      setSubStep(1);
    } else if (
      errors.adminName ||
      errors.adminEmail ||
      errors.adminPassword ||
      errors.confirmPassword
    ) {
      setSubStep(2);
    } else if (errors.licenseKey) {
      setSubStep(3);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit, handleFormError)}
      className="space-y-4 flex flex-col justify-between flex-1"
      noValidate
    >
      <StepIndicatorBar
        subStep={subStep}
        onGoToStep1={() => setSubStep(1)}
        onGoToStep2={() => void handleNextToAdmin()}
        onGoToStep3={() => void handleGoToStep3()}
      />

      <div className="flex-1 space-y-4 pt-1">
        <OrgDetailsStep
          register={register}
          errors={errors}
          isActive={subStep === 1}
          companyName={companyNameValue}
          onGenerateCode={handleGenerateCode}
        />
        <AdminCredentialsStep
          register={register}
          errors={errors}
          isActive={subStep === 2}
          adminPasswordValue={adminPasswordValue}
          onGeneratePassword={handleGeneratePassword}
        />
        <LicensingStep register={register} errors={errors} isActive={subStep === 3} />
      </div>

      <LocalFormFooterActions
        subStep={subStep}
        isLoading={isLoading}
        onBack={onBack}
        onPrevSubStep={() => setSubStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2) : 1))}
        onNextToAdmin={() => void handleNextToAdmin()}
        onNextToLicense={() => void handleNextToLicense()}
      />
    </form>
  );
}
