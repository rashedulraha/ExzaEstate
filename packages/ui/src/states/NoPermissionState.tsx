import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '../components/button/Button.js';

export interface NoPermissionStateProps {
  permission?: string;
  onRequestAccess?: () => void;
  onGoBack?: () => void;
  className?: string;
}

export function NoPermissionState({
  permission,
  onRequestAccess,
  onGoBack,
  className = '',
}: NoPermissionStateProps) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-void/12 flex items-center justify-center text-void mb-4">
        <ShieldAlert className="w-6 h-6" aria-hidden="true" />
      </div>
      <h3 className="text-h3 font-semibold text-text">Access Restricted</h3>
      <p className="text-body text-text-muted mt-1 max-w-md">
        You do not have the required permissions to view this resource.
      </p>
      {permission && (
        <span className="mt-2 text-caption font-mono bg-surface-sunken px-2 py-0.5 rounded text-text-muted">
          Required: {permission}
        </span>
      )}
      <div className="mt-5 flex items-center gap-3">
        {onGoBack && (
          <Button
            variant="secondary"
            size="md"
            leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
            onClick={onGoBack}
          >
            Go back
          </Button>
        )}
        {onRequestAccess && (
          <Button variant="primary" size="md" onClick={onRequestAccess}>
            Request Access
          </Button>
        )}
      </div>
    </div>
  );
}
