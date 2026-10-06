import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { t } from '@exzaestate/shared';
import { useAuthFlow } from '../hooks/useAuthFlow.js';
import { loginSchema, type LoginFormData } from '../schemas/auth.schema.js';
import { TotpEnrollmentModal } from '../components/TotpEnrollmentModal.js';
import { LoginShowcase } from '../components/Loginshowcase.js';
import { ExzaLogoIcon, ThemeToggle } from '@exzaestate/ui';

export interface LoginPageProps {
  onSuccess?: () => void;
  /**
   * Desktop position of the product showcase. The login form takes the other side.
   * 'left'  -> showcase left, form right (default)
   * 'right' -> form left, showcase right
   */
  showcaseSide?: 'left' | 'right';
  defaultEmail?: string;
  defaultPassword?: string;
}

/**
 * Every colour below comes from theme.css tokens, so the form follows
 * light / dark mode and any future brand change automatically.
 */
const inputBase =
  'block w-full rounded-button border bg-surface px-4 py-3 text-body text-text placeholder:text-text-disabled transition focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus/20';

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
      <label htmlFor="login-password" className="block text-label">
        Password
      </label>
      <div className="relative mt-1.5">
        <input
          id="login-password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="••••••••••••"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'login-password-error' : undefined}
          {...register('password')}
          className={`${inputBase} pr-11 ${error ? 'border-danger' : 'border-border-input'}`}
        />
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          className="absolute inset-y-0 right-0 flex cursor-pointer items-center rounded-button pr-3.5 text-text-muted hover:text-text focus-visible:text-primary-fg"
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
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div>
        <label htmlFor="login-email" className="block text-label">
          Email address
        </label>
        <div className="mt-1.5">
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            autoFocus
            placeholder="name@company.com"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'login-email-error' : undefined}
            {...register('email')}
            className={`${inputBase} ${errors.email ? 'border-danger' : 'border-border-input'}`}
          />
        </div>
        {errors.email && (
          <p id="login-email-error" className="mt-1 text-caption text-danger">
            {errors.email.message}
          </p>
        )}
      </div>

      <PasswordInputField register={register} error={errors.password?.message} />

      <div className="pt-3">
        <button
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          className="flex w-full cursor-pointer items-center justify-center rounded-button bg-action px-4 py-3 text-btn font-semibold text-on-action shadow-sm transition enabled:hover:bg-action-hover enabled:active:bg-action-active disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-on-action border-t-transparent" />
              <span>{t('common.loading')}</span>
            </span>
          ) : (
            'Sign in'
          )}
        </button>
      </div>
    </form>
  );
}

export function LoginPage({
  onSuccess,
  showcaseSide = 'left',
  defaultEmail,
  defaultPassword,
}: LoginPageProps) {
  const { handleLogin, isSubmitting, errorMessage, errorCode } = useAuthFlow();
  const [showTotpEnrollment, setShowTotpEnrollment] = useState(false);

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
      onSuccess?.();
    }
  };

  const orderClass = showcaseSide === 'left' ? 'lg:order-2' : 'lg:order-1';

  return (
    <div className="flex min-h-screen w-full bg-bg text-text">
      <div className="grid min-h-screen w-full grid-cols-1 lg:grid-cols-12">
        <LoginShowcase side={showcaseSide} />

        <main
          className={`relative flex flex-col justify-center bg-surface px-6 py-12 lg:col-span-5 lg:px-12 xl:px-16 ${orderClass}`}
        >
          <div className="absolute top-4 right-4 z-10">
            <ThemeToggle />
          </div>

          <div className="mx-auto w-full max-w-sm">
            {/* Mobile brand (the showcase is hidden below lg) */}
            <div className="mb-10 lg:hidden">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-button border border-sidebar-border bg-sidebar">
                  <ExzaLogoIcon size={26} variant="gold" />
                </div>
                <div>
                  <div className="text-h2 font-bold text-text">{t('app.name')}</div>
                  <p className="text-caption text-text-muted">
                    Enterprise Real Estate Management & ERP
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h1 className="text-display font-bold text-text">Sign in</h1>
              <p className="mt-2 text-body text-text-muted">
                Enter your credentials to open your workspace.
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

            <div className="mt-4 text-center">
              <Link
                to="/setup/first-launch"
                className="text-caption font-semibold text-primary hover:underline cursor-pointer"
              >
                First time setup? Activate License & Register Organization →
              </Link>
            </div>

            <div className="mt-10 border-t border-border pt-6 text-center">
              <p className="text-caption text-text-muted">
                Protected by hardware-bound cryptographic security and row-level isolation
              </p>
            </div>
          </div>
        </main>
      </div>

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
