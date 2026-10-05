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
      <div className="rounded-card border border-border bg-surface-sunken p-4 text-center">
        {qrCodeUrl ? (
          <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-button bg-surface p-2 shadow-inner border border-border">
            <img src={qrCodeUrl} alt="2FA QR Code" className="h-full w-full object-contain" />
          </div>
        ) : (
          <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-button bg-surface-sunken p-4 text-caption text-text-muted">
            QR Code Unavailable
          </div>
        )}

        <div className="mt-3">
          <p className="text-caption text-text-muted">Manual Entry Key:</p>
          <code className="mt-1 inline-block select-all rounded-button border border-border bg-surface px-2 py-1 font-mono text-caption font-semibold text-text">
            {secret || 'Generating...'}
          </code>
        </div>
      </div>

      <form onSubmit={handleSubmit(onVerify)} className="space-y-4">
        <div>
          <label htmlFor="totp-token" className="block text-caption font-medium text-text-muted">
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
            className="mt-1 block w-full rounded-button border border-border-input bg-surface px-3 py-2 text-center text-h2 tracking-widest text-text placeholder-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
          />
          {errors.token && <p className="mt-1 text-caption text-danger">{errors.token.message}</p>}
          {errorMsg && <p className="mt-1 text-caption text-danger">{errorMsg}</p>}
        </div>

        <div className="flex justify-end space-x-3">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-button border border-border px-4 py-2 text-btn font-medium text-text hover:bg-surface-sunken focus:outline-none focus:ring-2 focus:ring-focus cursor-pointer"
            >
              {t('common.cancel')}
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-button bg-action px-5 py-2 text-btn font-medium text-on-action hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-focus disabled:opacity-50 cursor-pointer"
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
      <div className="rounded-card border border-success/30 bg-success/12 p-4">
        <div className="flex items-center space-x-2 text-success">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <h4 className="text-body font-semibold text-success">2FA Successfully Enabled!</h4>
        </div>
        <p className="mt-1 text-caption text-text-muted">
          Save these 10 one-time recovery codes in a safe place. If you ever lose your phone, you
          can use one of these codes to sign in.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-card border border-border bg-surface-sunken p-3 font-mono text-caption text-text">
        {recoveryCodes.map((code, idx) => (
          <div
            key={idx}
            className="rounded-button border border-border bg-surface px-2 py-1 shadow-xs text-center"
          >
            {code}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center space-x-1.5 rounded-button border border-border px-3 py-1.5 text-btn font-medium text-text hover:bg-surface-sunken focus:outline-none focus:ring-2 focus:ring-focus cursor-pointer"
        >
          <span>{copied ? '✓ Copied!' : 'Copy Recovery Codes'}</span>
        </button>

        <button
          type="button"
          onClick={onFinish}
          className="rounded-button bg-action px-5 py-2 text-btn font-medium text-on-action hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-focus cursor-pointer"
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
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
      <p className="mt-4 text-caption text-text-muted">{t('common.loading')}</p>
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-primary-deep/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="totp-modal-title"
    >
      <div className="w-full max-w-lg rounded-modal border border-border bg-surface-elevated p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h3 id="totp-modal-title" className="text-h2 font-semibold text-text">
              {t('auth.totp.modalTitle')}
            </h3>
            <p className="mt-1 text-caption text-text-muted">{t('auth.totp.modalSubtitle')}</p>
          </div>
          {onClose && step !== 'recovery' && (
            <button
              type="button"
              onClick={onClose}
              className="text-text-muted hover:text-text cursor-pointer"
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
