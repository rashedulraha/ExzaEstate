import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@exzaestate/app-core';
import { t } from '@exzaestate/shared';
import { totpVerificationSchema, type TotpVerificationFormData } from '../schemas/auth.schema.js';

export interface StepUpModalProps {
  isOpen?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function StepUpModal({ isOpen, onSuccess, onCancel }: StepUpModalProps) {
  const { stepUpRequired, verifyStepUp, dismissStepUp } = useAuth();
  const [isVerifying, setIsVerifying] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const show = isOpen ?? stepUpRequired;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TotpVerificationFormData>({
    resolver: zodResolver(totpVerificationSchema),
    defaultValues: { token: '' },
  });

  if (!show) {
    return null;
  }

  const handleClose = () => {
    reset();
    setServerError(null);
    dismissStepUp();
    onCancel?.();
  };

  const onSubmit = async (data: TotpVerificationFormData) => {
    setIsVerifying(true);
    setServerError(null);

    const success = await verifyStepUp(data.token);
    setIsVerifying(false);

    if (success) {
      reset();
      onSuccess?.();
    } else {
      setServerError('Invalid authenticator code. Please try again.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="step-up-title"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <div>
            <h3
              id="step-up-title"
              className="text-base font-semibold text-slate-900 dark:text-slate-100"
            >
              {t('auth.stepUp.title')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('auth.stepUp.description')}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="step-up-token"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              6-Digit Authenticator Code
            </label>
            <input
              id="step-up-token"
              type="text"
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              autoFocus
              placeholder="000000"
              {...register('token')}
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-center text-xl tracking-widest text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            {errors.token && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.token.message}</p>
            )}
            {serverError && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{serverError}</p>
            )}
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isVerifying}
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400"
            >
              {isVerifying ? t('common.loading') : t('common.confirm')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
