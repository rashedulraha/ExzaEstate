import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../components/button/Button.js';

export interface ErrorStateProps {
  errorCode?: string;
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  errorCode,
  title = 'Something went wrong',
  message = 'We encountered an error loading this data. Please try again.',
  onRetry,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-danger/12 flex items-center justify-center text-danger mb-4">
        <AlertCircle className="w-6 h-6" aria-hidden="true" />
      </div>
      <h3 className="text-h3 font-semibold text-text">{title}</h3>
      <p className="text-body text-text-muted mt-1 max-w-md">{message}</p>
      {errorCode && (
        <span className="mt-2 text-caption font-mono bg-surface-sunken px-2 py-0.5 rounded text-text-muted">
          Code: {errorCode}
        </span>
      )}
      {onRetry && (
        <div className="mt-5">
          <Button
            variant="secondary"
            size="md"
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={onRetry}
          >
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}
