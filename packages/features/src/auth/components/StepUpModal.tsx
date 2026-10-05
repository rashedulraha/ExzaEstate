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
      className="fixed inset-0 z-50 flex items-center justify-center bg-primary-deep/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="step-up-title"
    >
      <div className="w-full max-w-md rounded-modal border border-border bg-surface-elevated p-6 shadow-2xl">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/15 text-warning">
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
            <h3 id="step-up-title" className="text-h2 font-semibold text-text">
              {t('auth.stepUp.title')}
            </h3>
            <p className="text-caption text-text-muted">{t('auth.stepUp.description')}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="step-up-token"
              className="block text-caption font-medium text-text-muted"
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
              className="mt-1 block w-full rounded-button border border-border-input bg-surface px-3 py-2 text-center text-h1 tracking-widest text-text placeholder-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
            />
            {errors.token && (
              <p className="mt-1 text-caption text-danger">{errors.token.message}</p>
            )}
            {serverError && <p className="mt-1 text-caption text-danger">{serverError}</p>}
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-button border border-border px-4 py-2 text-btn font-medium text-text hover:bg-surface-sunken focus:outline-none focus:ring-2 focus:ring-focus cursor-pointer"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isVerifying}
              className="inline-flex items-center justify-center rounded-button bg-action px-4 py-2 text-btn font-medium text-on-action hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-focus disabled:opacity-50 cursor-pointer"
            >
              {isVerifying ? t('common.loading') : t('common.confirm')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
