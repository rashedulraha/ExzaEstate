import { useAuth } from '@exzaestate/app-core';
import { t } from '@exzaestate/shared';

export interface SessionExpiredModalProps {
  onSignInAgain?: () => void;
}

export function SessionExpiredModal({ onSignInAgain }: SessionExpiredModalProps) {
  const { sessionExpired, dismissSessionExpired } = useAuth();

  if (!sessionExpired) {
    return null;
  }

  const handleAction = () => {
    dismissSessionExpired();
    if (onSignInAgain) {
      onSignInAgain();
    } else if (typeof window !== 'undefined') {
      window.location.href = '/auth/login';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
      aria-describedby="session-expired-desc"
    >
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 text-center shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400">
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h3
          id="session-expired-title"
          className="text-lg font-semibold text-slate-900 dark:text-slate-100"
        >
          {t('auth.sessionExpired.title')}
        </h3>

        <p id="session-expired-desc" className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {t('auth.sessionExpired.description')}
        </p>

        <div className="mt-6">
          <button
            type="button"
            onClick={handleAction}
            className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            {t('auth.sessionExpired.signInAgain')}
          </button>
        </div>
      </div>
    </div>
  );
}
