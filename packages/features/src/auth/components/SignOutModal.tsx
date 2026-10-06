import { useEffect, type ReactElement } from 'react';
import { LogOut } from 'lucide-react';
import { t } from '@exzaestate/shared';

export interface SignOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  isSigningOut?: boolean;
}

export function SignOutModal({
  isOpen,
  onClose,
  onConfirm,
  isSigningOut = false,
}: SignOutModalProps): ReactElement | null {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSigningOut) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSigningOut, onClose]);

  if (!isOpen) {
    return null;
  }

  const title = t('auth.signOut.title') || 'Sign Out';
  const description =
    t('auth.signOut.description') ||
    'Are you sure you want to sign out of ExzaEstate ERP? You will need your credentials to open your workspace again.';
  const cancelText = t('auth.signOut.cancel') || 'Cancel';
  const confirmText = t('auth.signOut.confirm') || 'Sign Out';
  const inProgressText = t('auth.signOut.inProgress') || 'Signing out...';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="signout-dialog-title"
      aria-describedby="signout-dialog-desc"
      onClick={() => {
        if (!isSigningOut) onClose();
      }}
    >
      <div
        className="w-full max-w-sm rounded-modal border border-border bg-surface-elevated p-6 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger/12 text-danger">
          <LogOut className="h-6 w-6" aria-hidden="true" />
        </div>

        <h3 id="signout-dialog-title" className="text-h2 font-semibold text-text">
          {title}
        </h3>

        <p id="signout-dialog-desc" className="mt-2 text-body text-text-muted">
          {description}
        </p>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={isSigningOut}
            onClick={onClose}
            className="flex-1 cursor-pointer rounded-button border border-border bg-surface px-4 py-2.5 text-btn font-medium text-text transition hover:bg-surface-sunken focus:outline-none focus:ring-2 focus:ring-focus disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={isSigningOut}
            onClick={() => void onConfirm()}
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-button bg-danger px-4 py-2.5 text-btn font-medium text-white shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-danger disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSigningOut ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>{inProgressText}</span>
              </>
            ) : (
              <span>{confirmText}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
