import { Building2, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

export interface PlatformTenantsMetricStripProps {
  totalCount: number;
  activeCount: number;
  suspendedCount: number;
  licenseCount: number;
}

export function PlatformTenantsMetricStrip({
  totalCount,
  activeCount,
  suspendedCount,
  licenseCount,
}: PlatformTenantsMetricStripProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="rounded-card border border-border bg-surface p-4 shadow-xs">
        <div className="flex items-center justify-between text-caption text-text-muted font-medium mb-1">
          <span>Total Companies</span>
          <Building2 className="w-4 h-4 text-primary" />
        </div>
        <div className="text-h1 font-semibold text-text tracking-tight font-mono tabular-nums">
          {totalCount}
        </div>
        <div className="text-caption text-text-muted mt-1">
          All client businesses registered on ExzaEstate
        </div>
      </div>

      <div className="rounded-card border border-border bg-surface p-4 shadow-xs">
        <div className="flex items-center justify-between text-caption text-text-muted font-medium mb-1">
          <span>Active Companies</span>
          <CheckCircle2 className="w-4 h-4 text-success" />
        </div>
        <div className="text-h1 font-semibold text-success tracking-tight font-mono tabular-nums">
          {activeCount}
        </div>
        <div className="text-caption text-text-muted mt-1">
          Operating normally with full login access
        </div>
      </div>

      <div className="rounded-card border border-border bg-surface p-4 shadow-xs">
        <div className="flex items-center justify-between text-caption text-text-muted font-medium mb-1">
          <span>Suspended Accounts</span>
          <AlertTriangle className="w-4 h-4 text-danger" />
        </div>
        <div className="text-h1 font-semibold text-danger tracking-tight font-mono tabular-nums">
          {suspendedCount}
        </div>
        <div className="text-caption text-text-muted mt-1">
          Temporarily paused from employee logins
        </div>
      </div>

      <div className="rounded-card border border-border bg-surface p-4 shadow-xs">
        <div className="flex items-center justify-between text-caption text-text-muted font-medium mb-1">
          <span>Active Licenses</span>
          <ShieldCheck className="w-4 h-4 text-primary" />
        </div>
        <div className="text-h1 font-semibold text-primary tracking-tight font-mono tabular-nums">
          {licenseCount}
        </div>
        <div className="text-caption text-text-muted mt-1">
          Valid software subscriptions assigned
        </div>
      </div>
    </div>
  );
}
