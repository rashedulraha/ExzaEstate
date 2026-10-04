import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { t } from '@exzaestate/shared';
import { useAuthFlow } from '../hooks/useAuthFlow.js';
import { loginSchema, type LoginFormData } from '../schemas/auth.schema.js';
import { TotpEnrollmentModal } from '../components/TotpEnrollmentModal.js';

export interface LoginPageProps {
  onSuccess?: () => void;
}

export function LoginPage({ onSuccess }: LoginPageProps) {
  const { handleLogin, isSubmitting, errorMessage, errorCode } = useAuthFlow();
  const [showPassword, setShowPassword] = useState(false);
  const [showTotpEnrollment, setShowTotpEnrollment] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    const success = await handleLogin(data);
    if (success) {
      onSuccess?.();
    } else if (errorCode === 'TWO_FACTOR_REQUIRED') {
      setShowTotpEnrollment(true);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0F0F1A] p-4 text-slate-100 selection:bg-amber-500 selection:text-slate-950">
      {/* Centered 400px card as mandated by design.md §4.4 */}
      <div className="w-full max-w-[400px] rounded-2xl border border-slate-800 bg-[#161626] p-8 shadow-2xl shadow-black/60">
        {/* Brand Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20">
            <span className="font-serif text-2xl font-bold tracking-tight">E</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">{t('app.name')}</h1>
          <p className="mt-1 text-xs text-slate-400">Enterprise Real Estate Management & ERP</p>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div
            className="mb-6 rounded-lg border border-red-500/30 bg-red-950/40 p-3 text-xs text-red-300"
            role="alert"
          >
            <div className="flex items-center space-x-2">
              <svg
                className="h-4 w-4 shrink-0 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span>{errorMessage}</span>
            </div>
            {errorCode === 'TWO_FACTOR_REQUIRED' && (
              <button
                type="button"
                onClick={() => setShowTotpEnrollment(true)}
                className="mt-2 text-xs font-semibold text-amber-400 underline hover:text-amber-300"
              >
                Set up 2FA now →
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Email field */}
          <div>
            <label htmlFor="login-email" className="block text-xs font-medium text-slate-300">
              Email Address
            </label>
            <div className="mt-1">
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="name@company.com"
                {...register('email')}
                className="block w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
          </div>

          {/* Password field */}
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="login-password" className="block text-xs font-medium text-slate-300">
                Password
              </label>
            </div>
            <div className="relative mt-1">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••••••"
                {...register('password')}
                className="block w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3.5 py-2.5 pr-10 text-sm text-white placeholder-slate-500 transition focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-200"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                    />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>
            )}
          </div>

          {/* Submit button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="relative flex w-full justify-center rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-md shadow-amber-500/10 transition hover:from-amber-400 hover:to-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="flex items-center space-x-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                  <span>{t('common.loading')}</span>
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </div>
        </form>

        {/* Security badge footer */}
        <div className="mt-8 border-t border-slate-800/80 pt-4 text-center">
          <p className="text-[11px] text-slate-500">
            Protected by hardware-bound cryptographic security & RLS
          </p>
        </div>
      </div>

      {/* TOTP 2FA Setup Modal if user requires enrollment */}
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
