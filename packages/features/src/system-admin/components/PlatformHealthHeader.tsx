import { RefreshCw } from 'lucide-react';
import { Button } from '@exzaestate/ui';

export interface PlatformHealthHeaderProps {
  isHealthy: boolean;
  isLoading: boolean;
  onRefresh: () => void;
}

export function PlatformHealthHeader({
  isHealthy,
  isLoading,
  onRefresh,
}: PlatformHealthHeaderProps) {
  const statusBadgeClass = isHealthy
    ? 'bg-success/10 text-success border-success/20'
    : 'bg-danger/10 text-danger border-danger/20';

  const dotClass = isHealthy ? 'bg-success animate-ping' : 'bg-danger';
  const statusText = isHealthy ? 'All Systems Running' : 'Attention Needed';

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <h1 className="text-h1 font-semibold tracking-tight text-text">
            System Health &amp; Server Performance
          </h1>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-caption font-medium border ${statusBadgeClass}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
            {statusText}
          </span>
        </div>
        <p className="text-small text-text-muted">
          Live server performance, company data privacy status, automated background tasks, and
          security safeguards.
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-caption text-text-muted hidden sm:inline">
          Auto-refreshes every 15s
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={onRefresh}
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
        >
          Refresh Status
        </Button>
      </div>
    </div>
  );
}
