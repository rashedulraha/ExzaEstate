import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { t } from '@exzaestate/shared';
import { useAuthFlow } from '../hooks/useAuthFlow.js';
import { totpVerificationSchema, type TotpVerificationFormData } from '../schemas/auth.schema.js';

export interface TotpEnrollmentModalProps {
  isOpen: boolean;
  onSuccess?: () => void;
  onClose?: () => void;
}

interface TotpSetupStepProps {
  qrCodeUrl: string;
  secret: string;
  errorMsg: string | null;
  onClose?: () => void;
  onVerify: (data: TotpVerificationFormData) => Promise<void>;
}

function TotpSetupStep({ qrCodeUrl, secret, errorMsg, onClose, onVerify }: TotpSetupStepProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TotpVerificationFormData>({
    resolver: zodResolver(totpVerificationSchema),
    defaultValues: { token: '' },
  });

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-center dark:border-slate-800 dark:bg-slate-800/50">
        {qrCodeUrl ? (
          <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-lg bg-white p-2 shadow-inner">
            <img src={qrCodeUrl} alt="2FA QR Code" className="h-full w-full object-contain" />
          </div>
        ) : (
          <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-lg bg-slate-100 p-4 text-xs text-slate-400 dark:bg-slate-800">
            QR Code Unavailable
          </div>
        )}

        <div className="mt-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">Manual Entry Key:</p>
          <code className="mt-1 inline-block select-all rounded bg-slate-200 px-2 py-1 font-mono text-xs font-semibold text-slate-800 dark:bg-slate-700 dark:text-slate-200">
            {secret || 'Generating...'}
          </code>
        </div>
      </div>

      <form onSubmit={handleSubmit(onVerify)} className="space-y-4">
        <div>
          <label
            htmlFor="totp-token"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            Enter the 6-digit code shown in your app
          </label>
          <input
            id="totp-token"
            type="text"
            inputMode="numeric"
            maxLength={6}
            autoComplete="one-time-code"
            placeholder="123456"
            {...register('token')}
            className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-center text-lg tracking-widest text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-white dark:focus:ring-white"
          />
          {errors.token && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.token.message}</p>
          )}
          {errorMsg && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errorMsg}</p>}
        </div>

        <div className="flex justify-end space-x-3">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {t('common.cancel')}
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-slate-900 px-5 py-2 text-xs font-medium text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            {isSubmitting ? t('common.loading') : 'Verify & Enable 2FA'}
          </button>
        </div>
      </form>
    </div>
  );
}

interface TotpRecoveryStepProps {
  recoveryCodes: string[];
  copied: boolean;
  onCopy: () => void;
  onFinish: () => void;
}

function TotpRecoveryStep({ recoveryCodes, copied, onCopy, onFinish }: TotpRecoveryStepProps) {
  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-950 dark:bg-emerald-950/40">
        <div className="flex items-center space-x-2 text-emerald-800 dark:text-emerald-300">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <h4 className="text-sm font-semibold">2FA Successfully Enabled!</h4>
        </div>
        <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
          Save these 10 one-time recovery codes in a safe place. If you ever lose your phone, you
          can use one of these codes to sign in.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        {recoveryCodes.map((code, idx) => (
          <div key={idx} className="rounded bg-white px-2 py-1 shadow-xs dark:bg-slate-700">
            {code}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <span>{copied ? '✓ Copied!' : 'Copy Recovery Codes'}</span>
        </button>

        <button
          type="button"
          onClick={onFinish}
          className="rounded-lg bg-slate-900 px-5 py-2 text-xs font-medium text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
        >
          I have saved my recovery codes
        </button>
      </div>
    </div>
  );
}

function TotpLoadingStep() {
  return (
    <div className="flex flex-col items-center justify-center py-12" role="status">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900 dark:border-slate-700 dark:border-t-white" />
      <p className="mt-4 text-xs text-slate-500">{t('common.loading')}</p>
    </div>
  );
}

export function TotpEnrollmentModal({ isOpen, onSuccess, onClose }: TotpEnrollmentModalProps) {
  const { generate2FaSecret, enable2Fa } = useAuthFlow();
  const [step, setStep] = useState<'loading' | 'setup' | 'recovery'>('loading');
  const [secret, setSecret] = useState<string>('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setStep('loading');
      setSecret('');
      setQrCodeUrl('');
      setRecoveryCodes([]);
      setErrorMsg(null);
      setCopied(false);
      return;
    }

    let isMounted = true;
    async function init() {
      try {
        setStep('loading');
        setErrorMsg(null);
        const res = await generate2FaSecret();
        if (isMounted) {
          setSecret(res.secret);
          setQrCodeUrl(res.qrCodeUrl);
          setStep('setup');
        }
      } catch {
        if (isMounted) {
          setErrorMsg('Failed to initialize two-factor authentication setup.');
          setStep('setup');
        }
      }
    }

    void init();

    return () => {
      isMounted = false;
    };
  }, [isOpen, generate2FaSecret]);

  if (!isOpen) {
    return null;
  }

  const handleVerify = async (data: TotpVerificationFormData) => {
    setErrorMsg(null);
    try {
      const codes = await enable2Fa(secret, data.token);
      setRecoveryCodes(codes);
      setStep('recovery');
    } catch {
      setErrorMsg('Invalid verification code. Please check your authenticator app.');
    }
  };

  const handleCopy = async () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(recoveryCodes.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleFinish = () => {
    onSuccess?.();
    onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="totp-modal-title"
    >
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between">
          <div>
            <h3
              id="totp-modal-title"
              className="text-lg font-semibold text-slate-900 dark:text-slate-100"
            >
              {t('auth.totp.modalTitle')}
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {t('auth.totp.modalSubtitle')}
            </p>
          </div>
          {onClose && step !== 'recovery' && (
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        {step === 'loading' && <TotpLoadingStep />}

        {step === 'setup' && (
          <TotpSetupStep
            qrCodeUrl={qrCodeUrl}
            secret={secret}
            errorMsg={errorMsg}
            onClose={onClose}
            onVerify={handleVerify}
          />
        )}

        {step === 'recovery' && (
          <TotpRecoveryStep
            recoveryCodes={recoveryCodes}
            copied={copied}
            onCopy={handleCopy}
            onFinish={handleFinish}
          />
        )}
      </div>
    </div>
  );
}
