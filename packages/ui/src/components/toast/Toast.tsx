import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export interface ToastItem {
  id: string;
  family: 'success' | 'warning' | 'danger' | 'info';
  title: string;
  description?: string;
  durationMs?: number;
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toastFamilyStyles: Record<
  ToastItem['family'],
  { border: string; icon: React.ReactElement; iconColor: string }
> = {
  success: {
    border: 'border-l-4 border-l-success',
    icon: <CheckCircle2 className="w-4 h-4 text-success shrink-0" aria-hidden="true" />,
    iconColor: 'text-success',
  },
  warning: {
    border: 'border-l-4 border-l-warning',
    icon: <AlertTriangle className="w-4 h-4 text-warning shrink-0" aria-hidden="true" />,
    iconColor: 'text-warning',
  },
  danger: {
    border: 'border-l-4 border-l-danger',
    icon: <AlertCircle className="w-4 h-4 text-danger shrink-0" aria-hidden="true" />,
    iconColor: 'text-danger',
  },
  info: {
    border: 'border-l-4 border-l-info',
    icon: <Info className="w-4 h-4 text-info shrink-0" aria-hidden="true" />,
    iconColor: 'text-info',
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ family, title, description, durationMs }: Omit<ToastItem, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const isError = family === 'danger';
      const effectiveDuration = durationMs ?? (isError ? 0 : 5000);

      setToasts((prev) => [
        ...prev.slice(-2),
        { id, family, title, description, durationMs: effectiveDuration },
      ]);

      if (effectiveDuration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, effectiveDuration);
      }
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((toast) => {
          const config = toastFamilyStyles[toast.family];
          return (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto flex items-start gap-3 p-3.5 bg-surface-elevated text-text rounded-button border border-border shadow-md transition-all animate-in fade-in-50 duration-150 ${config.border}`}
            >
              {config.icon}
              <div className="flex-1 min-w-0">
                <p className="text-small font-medium text-text">{toast.title}</p>
                {toast.description && (
                  <p className="text-caption text-text-muted mt-0.5">{toast.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-text-muted hover:text-text cursor-pointer p-0.5 rounded"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
