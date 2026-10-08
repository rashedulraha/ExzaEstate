import { useNavigate } from 'react-router';
import { Building2, KeyRound, BarChart3, ShieldCheck } from 'lucide-react';
import type { SystemHealthData } from '../schemas/system-admin.schema.js';

export interface PlatformFastNavCardsProps {
  totalTenants: number;
  activeTenantsCount: number;
  suspendedTenantsCount: number;
  totalLicenses: number;
  health: SystemHealthData | null | undefined;
  totalAuditLogs: number;
}

export function PlatformFastNavCards({
  totalTenants,
  activeTenantsCount,
  suspendedTenantsCount,
  totalLicenses,
  health,
  totalAuditLogs,
}: PlatformFastNavCardsProps) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <button
        type="button"
        onClick={() => navigate('/system/tenants')}
        className="rounded-card border border-border bg-surface p-4 text-left shadow-xs hover:border-primary/40 hover:bg-surface-sunken/40 transition-all cursor-pointer group"
      >
        <div className="flex items-center justify-between text-caption text-text-muted font-medium mb-1">
          <span>Company Directory</span>
          <Building2 className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
        </div>
        <div className="text-h2 font-semibold text-text tracking-tight font-mono tabular-nums">
          {totalTenants} Companies
        </div>
        <div className="flex items-center justify-between text-caption text-text-muted mt-2">
          <span>
            {activeTenantsCount} active · {suspendedTenantsCount} suspended
          </span>
          <span className="text-primary font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            View All →
          </span>
        </div>
      </button>

      <button
        type="button"
        onClick={() => navigate('/system/licenses')}
        className="rounded-card border border-border bg-surface p-4 text-left shadow-xs hover:border-primary/40 hover:bg-surface-sunken/40 transition-all cursor-pointer group"
      >
        <div className="flex items-center justify-between text-caption text-text-muted font-medium mb-1">
          <span>Software Licenses</span>
          <KeyRound className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
        </div>
        <div className="text-h2 font-semibold text-text tracking-tight font-mono tabular-nums">
          {totalLicenses} Issued
        </div>
        <div className="flex items-center justify-between text-caption text-text-muted mt-2">
          <span>Valid software subscriptions</span>
          <span className="text-primary font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            Manage →
          </span>
        </div>
      </button>

      <button
        type="button"
        onClick={() => navigate('/system/health')}
        className="rounded-card border border-border bg-surface p-4 text-left shadow-xs hover:border-primary/40 hover:bg-surface-sunken/40 transition-all cursor-pointer group"
      >
        <div className="flex items-center justify-between text-caption text-text-muted font-medium mb-1">
          <span>System & Server Status</span>
          <BarChart3 className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
        </div>
        <div className="text-h2 font-semibold text-text tracking-tight flex items-center gap-2">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${health?.status === 'ok' ? 'bg-success' : 'bg-danger'}`}
          />
          {health?.status === 'ok' ? 'All Systems Running' : 'Attention Needed'}
        </div>
        <div className="flex items-center justify-between text-caption text-text-muted mt-2">
          <span>Database, memory & sync jobs</span>
          <span className="text-primary font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            Inspect →
          </span>
        </div>
      </button>

      <button
        type="button"
        onClick={() => navigate('/system/audit')}
        className="rounded-card border border-border bg-surface p-4 text-left shadow-xs hover:border-primary/40 hover:bg-surface-sunken/40 transition-all cursor-pointer group"
      >
        <div className="flex items-center justify-between text-caption text-text-muted font-medium mb-1">
          <span>Activity & Audit Log</span>
          <ShieldCheck className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
        </div>
        <div className="text-h2 font-semibold text-text tracking-tight font-mono tabular-nums">
          {totalAuditLogs} Actions
        </div>
        <div className="flex items-center justify-between text-caption text-text-muted mt-2">
          <span>Permanent security history</span>
          <span className="text-primary font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            View Log →
          </span>
        </div>
      </button>
    </div>
  );
}
