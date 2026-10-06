import { KeyRound, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@exzaestate/ui';

interface PlatformDashboardHeaderProps {
  isLoading: boolean;
  onRefreshAll: () => void;
  onOpenLicense: () => void;
  onOpenOnboard: () => void;
}

export function PlatformDashboardHeader({
  isLoading,
  onRefreshAll,
  onOpenLicense,
  onOpenOnboard,
}: PlatformDashboardHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <h1 className="text-h1 font-semibold tracking-tight text-text">
            Platform Administration Cockpit
          </h1>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-caption font-medium bg-primary/10 text-primary border border-primary/20">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Super Admin Realm
          </span>
        </div>
        <p className="text-small text-text-muted">
          Multi-tenant orchestration, cryptographic license governance & cluster telemetry
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onRefreshAll}
          className="p-2 rounded-button text-text-muted hover:text-text bg-surface hover:bg-surface-sunken border border-border transition cursor-pointer active:scale-[0.96]"
          title="Refresh platform telemetry"
          aria-label="Refresh platform telemetry"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>

        <Button
          variant="secondary"
          size="sm"
          onClick={onOpenLicense}
          leftIcon={<KeyRound className="w-3.5 h-3.5" />}
        >
          Issue License
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={onOpenOnboard}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
        >
          Onboard Company
        </Button>
      </div>
    </div>
  );
}
