import { useState, type ReactElement } from 'react';
import type { UseFormRegister } from 'react-hook-form';
import { Input } from '@exzaestate/ui';
import type { CreateLocalCompanyInput } from '../schemas/first-launch.schema.js';

export interface PasswordSuffixActionsProps {
  showPassword: boolean;
  onToggleShow: () => void;
  passwordValue?: string;
  onCopyPassword?: () => void;
  isCopied?: boolean;
}

function CopyIcon({ isCopied }: { isCopied: boolean }): ReactElement {
  if (isCopied) {
    return (
      <svg
        className="w-4 h-4 text-success"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    );
  }
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"
      />
    </svg>
  );
}

function EyeIcon({ showPassword }: { showPassword: boolean }): ReactElement {
  if (showPassword) {
    return (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
        />
      </svg>
    );
  }
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

export function PasswordSuffixActions({
  showPassword,
  onToggleShow,
  passwordValue,
  onCopyPassword,
  isCopied = false,
}: PasswordSuffixActionsProps): ReactElement {
  const showCopy = Boolean(onCopyPassword && passwordValue);

  return (
    <div className="flex items-center gap-1 text-text-muted">
      {showCopy && (
        <button
          type="button"
          onClick={onCopyPassword}
          title={isCopied ? 'Password copied!' : 'Copy password to clipboard'}
          className="p-1 hover:text-text transition-colors cursor-pointer rounded"
          aria-label={isCopied ? 'Copied' : 'Copy password'}
        >
          <CopyIcon isCopied={isCopied} />
        </button>
      )}

      <button
        type="button"
        onClick={onToggleShow}
        title={showPassword ? 'Hide password' : 'Show password'}
        className="p-1 hover:text-text transition-colors cursor-pointer rounded"
        aria-label={showPassword ? 'Hide password' : 'Show password'}
      >
        <EyeIcon showPassword={showPassword} />
      </button>
    </div>
  );
}

function AutoGenerateButton({ onClick }: { onClick: () => void }): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Auto-generate a secure random password"
      className="text-caption font-medium text-primary hover:text-primary-hover hover:underline transition-colors cursor-pointer inline-flex items-center gap-1 bg-transparent p-0 border-0 outline-none select-none"
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
      <span>Auto-Generate</span>
    </button>
  );
}

export function MasterPasswordField({
  register,
  error,
  adminPasswordValue = '',
  onGeneratePassword,
}: {
  register: UseFormRegister<CreateLocalCompanyInput>;
  error?: string;
  adminPasswordValue?: string;
  onGeneratePassword?: () => void;
}): ReactElement {
  const [showPassword, setShowPassword] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    if (adminPasswordValue && typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(adminPasswordValue);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-1.5 w-full">
      <div className="flex items-center justify-between">
        <label htmlFor="local-adminPassword" className="block text-h4 text-text font-medium">
          Master Password{' '}
          <span className="text-danger ml-0.5" aria-hidden="true">
            *
          </span>
        </label>
        {onGeneratePassword && <AutoGenerateButton onClick={onGeneratePassword} />}
      </div>
      <Input
        id="local-adminPassword"
        type={showPassword ? 'text' : 'password'}
        placeholder="••••••••"
        className="pr-16"
        isError={Boolean(error)}
        suffixIcon={
          <PasswordSuffixActions
            showPassword={showPassword}
            onToggleShow={() => setShowPassword((prev) => !prev)}
            passwordValue={adminPasswordValue}
            onCopyPassword={handleCopy}
            isCopied={isCopied}
          />
        }
        {...register('adminPassword')}
      />
      {error ? (
        <p id="local-adminPassword-error" className="text-small text-danger" role="alert">
          {error}
        </p>
      ) : (
        <p id="local-adminPassword-helper" className="text-small text-text-muted">
          Minimum 8 characters
        </p>
      )}
    </div>
  );
}

export function ConfirmPasswordField({
  register,
  error,
}: {
  register: UseFormRegister<CreateLocalCompanyInput>;
  error?: string;
}): ReactElement {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-1.5 w-full">
      <div className="flex items-center justify-between">
        <label htmlFor="local-confirmPassword" className="block text-h4 text-text font-medium">
          Confirm Password{' '}
          <span className="text-danger ml-0.5" aria-hidden="true">
            *
          </span>
        </label>
      </div>
      <Input
        id="local-confirmPassword"
        type={showPassword ? 'text' : 'password'}
        placeholder="••••••••"
        className="pr-10"
        isError={Boolean(error)}
        suffixIcon={
          <PasswordSuffixActions
            showPassword={showPassword}
            onToggleShow={() => setShowPassword((prev) => !prev)}
          />
        }
        {...register('confirmPassword')}
      />
      {error ? (
        <p id="local-confirmPassword-error" className="text-small text-danger" role="alert">
          {error}
        </p>
      ) : (
        <p id="local-confirmPassword-helper" className="text-small text-text-muted">
          Repeat password to verify
        </p>
      )}
    </div>
  );
}
