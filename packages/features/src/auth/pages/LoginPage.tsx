import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { t } from '@exzaestate/shared';
import { useAuth } from '@exzaestate/app-core';
import { useAuthFlow } from '../hooks/useAuthFlow.js';
import { loginSchema, type LoginFormData } from '../schemas/auth.schema.js';
import { TotpEnrollmentModal } from '../components/TotpEnrollmentModal.js';
import { ExzaLogoIcon } from '@exzaestate/ui';

export interface LoginPageProps {
  onSuccess?: () => void;
  showcaseSide?: 'left' | 'right';
  defaultEmail?: string;
  defaultPassword?: string;
}

const inputBase =
  'block w-full h-10 rounded-button border border-border-input bg-surface-sunken/40 px-3.5 py-2 text-body text-text placeholder:text-text-disabled transition focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus/20 hover:border-border-strong';

function EyeIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
      />
    </svg>
  );
}

interface LoginErrorBannerProps {
  errorMessage: string | null;
  errorCode: string | null;
  onOpenTotp: () => void;
}

function LoginErrorBanner({ errorMessage, errorCode, onOpenTotp }: LoginErrorBannerProps) {
  if (!errorMessage) return null;
  return (
    <div
      className="mb-6 rounded-button border border-danger/30 bg-danger/10 p-3 text-caption text-danger"
      role="alert"
    >
      <p>{errorMessage}</p>
      {errorCode === 'TWO_FACTOR_REQUIRED' && (
        <button
          type="button"
          onClick={onOpenTotp}
          className="mt-2 cursor-pointer text-caption font-semibold text-primary-fg underline hover:opacity-80"
        >
          Set up 2FA now
        </button>
      )}
    </div>
  );
}

interface PasswordInputFieldProps {
  register: ReturnType<typeof useForm<LoginFormData>>['register'];
  error?: string;
}

function PasswordInputField({ register, error }: PasswordInputFieldProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div>
      <label htmlFor="login-password" className="block text-label font-medium text-text mb-1.5">
        Password
      </label>
      <div className="relative">
        <input
          id="login-password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="••••••••••••"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'login-password-error' : undefined}
          {...register('password')}
          className={`${inputBase} pr-11 ${error ? 'border-danger' : ''}`}
        />
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          className="absolute inset-y-0 right-0 flex cursor-pointer items-center pr-3 text-text-muted hover:text-text focus-visible:text-primary transition-colors"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          aria-pressed={showPassword}
        >
          {showPassword ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {error && (
        <p id="login-password-error" className="mt-1 text-caption text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

interface LoginFormFieldsProps {
  register: ReturnType<typeof useForm<LoginFormData>>['register'];
  errors: ReturnType<typeof useForm<LoginFormData>>['formState']['errors'];
  isSubmitting: boolean;
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
}

function LoginFormFields({ register, errors, isSubmitting, onSubmit }: LoginFormFieldsProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="login-email" className="block text-label font-medium text-text mb-1.5">
          Email Address
        </label>
        <div>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            autoFocus
            placeholder="name@company.com"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'login-email-error' : undefined}
            {...register('email')}
            className={`${inputBase} ${errors.email ? 'border-danger' : ''}`}
          />
        </div>
        {errors.email && (
          <p id="login-email-error" className="mt-1 text-caption text-danger">
            {errors.email.message}
          </p>
        )}
      </div>

      <PasswordInputField register={register} error={errors.password?.message} />

      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          className="flex w-full cursor-pointer items-center justify-center rounded-button bg-action px-4 py-2.5 text-btn font-semibold text-on-action shadow-sm transition enabled:hover:bg-action-hover enabled:active:bg-action-active active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-on-action border-t-transparent" />
              <span>{t('common.loading')}</span>
            </span>
          ) : (
            'Sign In'
          )}
        </button>
      </div>
    </form>
  );
}

export function LoginPage({ onSuccess, defaultEmail, defaultPassword }: LoginPageProps) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { handleLogin, isSubmitting, errorMessage, errorCode } = useAuthFlow();
  const [showTotpEnrollment, setShowTotpEnrollment] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, navigate, onSuccess]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: defaultEmail ?? '',
      password: defaultPassword ?? '',
    },
  });

  useEffect(() => {
    if (errorCode === 'TWO_FACTOR_REQUIRED') {
      setShowTotpEnrollment(true);
    }
  }, [errorCode]);

  const onSubmit = async (data: LoginFormData) => {
    const success = await handleLogin(data);
    if (success) {
      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  };

  return (
    <div className="min-h-screen w-full bg-bg text-text flex items-center justify-center p-4 sm:p-6 relative select-none">
      {/* Executive ambient background lighting for depth */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[540px] h-[340px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <main className="w-full max-w-[460px] bg-surface border border-border rounded-modal p-7 sm:p-9 shadow-lg relative overflow-hidden space-y-6">
        {/* Subtle accent hairline highlight at top edge */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
          aria-hidden="true"
        />

        {/* Brand header */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-button border border-border bg-surface-dark text-primary shadow-xs shrink-0">
            <ExzaLogoIcon size={26} variant="gold" />
          </div>
          <div>
            <div className="text-h2 font-bold text-text leading-tight">{t('app.name')}</div>
            <p className="text-caption text-text-muted">Enterprise Real Estate Management & ERP</p>
          </div>
        </div>

        <div>
          <h1 className="text-display font-bold text-text tracking-tight">Sign In</h1>
          <p className="mt-1 text-body text-text-muted leading-relaxed">
            Enter your credentials to access your workspace.
          </p>
        </div>

        <LoginErrorBanner
          errorMessage={errorMessage}
          errorCode={errorCode}
          onOpenTotp={() => setShowTotpEnrollment(true)}
        />

        <LoginFormFields
          register={register}
          errors={errors}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit(onSubmit)}
        />

        <div className="pt-1 text-center">
          <Link
            to="/setup/first-launch"
            className="inline-flex items-center justify-center gap-1.5 text-caption font-semibold text-primary hover:text-primary-light transition-colors cursor-pointer group whitespace-nowrap"
          >
            <span>First time setup? Activate License & Register Organization</span>
            <span className="transition-transform group-hover:translate-x-0.5" aria-hidden="true">
              →
            </span>
          </Link>
        </div>

        <div className="border-t border-border pt-4 text-center">
          <div className="inline-flex items-center justify-center gap-2 text-caption text-text-muted whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" aria-hidden="true" />
            <span>Hardware-bound cryptographic security • Row-level isolation</span>
          </div>
        </div>
      </main>

      <TotpEnrollmentModal
        isOpen={showTotpEnrollment}
        onSuccess={() => {
          setShowTotpEnrollment(false);
          onSuccess?.();
        }}
        onClose={() => setShowTotpEnrollment(false)}
      />
    </div>
  );
}
