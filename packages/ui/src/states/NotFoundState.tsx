import { Compass, ArrowLeft, Home } from 'lucide-react';
import { Button } from '../components/button/Button.js';

export interface NotFoundStateProps {
  title?: string;
  message?: string;
  path?: string;
  onGoHome?: () => void;
  onGoBack?: () => void;
  className?: string;
}

export function NotFoundState({
  title = 'Page Not Found',
  message = "The page you are looking for doesn't exist, has been removed, or has moved.",
  path,
  onGoHome,
  onGoBack,
  className = '',
}: NotFoundStateProps) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}
    >
      <div className="w-14 h-14 rounded-full bg-void/12 flex items-center justify-center text-void mb-4">
        <Compass className="w-7 h-7" aria-hidden="true" />
      </div>
      <span className="text-caption font-mono uppercase tracking-wider text-text-muted mb-1">
        404 — Not Found
      </span>
      <h3 className="text-h2 font-semibold text-text">{title}</h3>
      <p className="text-body text-text-muted mt-2 max-w-md">{message}</p>
      {path && (
        <span className="mt-3 text-caption font-mono bg-surface-sunken px-3 py-1 rounded-button text-text-muted">
          Path: {path}
        </span>
      )}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {onGoBack && (
          <Button
            variant="secondary"
            size="md"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={onGoBack}
          >
            Go Back
          </Button>
        )}
        {onGoHome && (
          <Button
            variant="primary"
            size="md"
            leftIcon={<Home className="w-4 h-4" />}
            onClick={onGoHome}
          >
            Back to Dashboard
          </Button>
        )}
      </div>
    </div>
  );
}
