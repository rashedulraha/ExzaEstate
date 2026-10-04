import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '../components/button/Button.js';

export interface OfflineStateProps {
  queuedChangesCount?: number;
  onRetry?: () => void;
  className?: string;
}

export function OfflineState({
  queuedChangesCount = 0,
  onRetry,
  className = '',
}: OfflineStateProps) {
  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-warning/12 flex items-center justify-center text-warning mb-4">
        <WifiOff className="w-6 h-6" aria-hidden="true" />
      </div>
      <h3 className="text-h3 font-semibold text-text">You are currently offline</h3>
      <p className="text-body text-text-muted mt-1 max-w-md">
        Network connection is unavailable.
        {queuedChangesCount > 0
          ? ` ${queuedChangesCount} offline changes are queued and will sync when reconnected.`
          : ' Cached data is available in read-only mode.'}
      </p>
      {onRetry && (
        <div className="mt-5">
          <Button
            variant="secondary"
            size="md"
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={onRetry}
          >
            Check connection
          </Button>
        </div>
      )}
    </div>
  );
}
