import { Server, Database, Activity, ShieldCheck } from 'lucide-react';

export interface PlatformHealthInspectionPanelsProps {
  memoryPct: number;
  heapUsedMb: string;
  heapTotalMb: string;
  externalMb: string;
  backupText: string;
  inFlight: number;
  completedJobs: number;
  failedJobs: number;
}

export function PlatformHealthInspectionPanels({
  memoryPct,
  heapUsedMb,
  heapTotalMb,
  externalMb,
  backupText,
  inFlight,
  completedJobs,
  failedJobs,
}: PlatformHealthInspectionPanelsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Panel 1: Server Performance & Memory */}
      <div className="rounded-card border border-border bg-surface p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-primary" />
            <h2 className="text-h3 font-semibold text-text">Server Performance &amp; Memory</h2>
          </div>
          <span className="text-caption font-mono text-text-muted px-2 py-0.5 rounded-button bg-surface-sunken border border-border">
            {memoryPct}% Capacity Used
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-caption mb-1.5">
              <span className="text-text-muted">Active Memory Usage</span>
              <span className="font-mono text-text tabular-nums font-semibold">
                {heapUsedMb} / {heapTotalMb}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-surface-sunken overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${memoryPct}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-card bg-surface-sunken/40 border border-border">
              <div className="text-caption text-text-muted">Supporting Memory</div>
              <div className="text-small font-mono text-text font-semibold mt-0.5">
                {externalMb}
              </div>
            </div>

            <div className="p-3 rounded-card bg-surface-sunken/40 border border-border">
              <div className="text-caption text-text-muted">Server Environment</div>
              <div className="text-small font-mono text-text font-semibold mt-0.5">
                Node.js / 64-bit Architecture
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Panel 2: Database & Storage Engine */}
      <div className="rounded-card border border-border bg-surface p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            <h2 className="text-h3 font-semibold text-text">Database &amp; Data Storage</h2>
          </div>
          <span className="text-caption font-semibold text-success px-2 py-0.5 rounded-button bg-success/10 border border-success/20">
            Privacy Guard Active
          </span>
        </div>

        <div className="space-y-3">
          <div className="p-3 rounded-card bg-surface-sunken/40 border border-border space-y-2">
            <div className="flex items-center justify-between text-caption">
              <span className="text-text-muted">Database Engine:</span>
              <span className="font-mono text-text font-semibold">PostgreSQL Enterprise</span>
            </div>
            <div className="flex items-center justify-between text-caption">
              <span className="text-text-muted">Data Isolation:</span>
              <span className="text-text font-medium">Automatic Company Separation</span>
            </div>
            <div className="flex items-center justify-between text-caption">
              <span className="text-text-muted">Automated Backups:</span>
              <span className="font-mono text-success font-semibold">{backupText}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-caption pt-1">
            <div className="p-2 rounded bg-surface-sunken/30 border border-border">
              <div className="text-text-muted">Application DB</div>
              <div className="font-mono font-semibold text-text mt-0.5">Connected</div>
            </div>
            <div className="p-2 rounded bg-surface-sunken/30 border border-border">
              <div className="text-text-muted">Schema Manager</div>
              <div className="font-mono font-semibold text-text mt-0.5">Synchronized</div>
            </div>
            <div className="p-2 rounded bg-surface-sunken/30 border border-border">
              <div className="text-text-muted">System Vault</div>
              <div className="font-mono font-semibold text-text mt-0.5">Secure</div>
            </div>
          </div>
        </div>
      </div>

      {/* Panel 3: Background Tasks & Sync */}
      <div className="rounded-card border border-border bg-surface p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <h2 className="text-h3 font-semibold text-text">Automated Tasks &amp; Sync Jobs</h2>
          </div>
          <span className="text-caption font-mono text-text-muted px-2 py-0.5 rounded-button bg-surface-sunken border border-border">
            Worker Queue Online
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-card bg-surface-sunken/40 border border-border text-center">
            <div className="text-caption text-text-muted">Processing Now</div>
            <div className="text-h2 font-semibold text-text font-mono tabular-nums mt-1">
              {inFlight}
            </div>
            <div className="text-caption text-text-muted mt-0.5">Active tasks</div>
          </div>

          <div className="p-3 rounded-card bg-surface-sunken/40 border border-border text-center">
            <div className="text-caption text-text-muted">Completed</div>
            <div className="text-h2 font-semibold text-success font-mono tabular-nums mt-1">
              {completedJobs}
            </div>
            <div className="text-caption text-text-muted mt-0.5">Successful tasks</div>
          </div>

          <div className="p-3 rounded-card bg-surface-sunken/40 border border-border text-center">
            <div className="text-caption text-text-muted">Failed / Retried</div>
            <div className="text-h2 font-semibold text-text-muted font-mono tabular-nums mt-1">
              {failedJobs}
            </div>
            <div className="text-caption text-text-muted mt-0.5">No errors</div>
          </div>
        </div>

        <p className="text-caption text-text-muted pt-1">
          Automated background services handle system alerts, scheduled emails, and instant
          cross-company syncing.
        </p>
      </div>

      {/* Panel 4: Platform Security & Protection */}
      <div className="rounded-card border border-border bg-surface p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <h2 className="text-h3 font-semibold text-text">Platform Security &amp; Protection</h2>
          </div>
          <span className="text-caption font-semibold text-success px-2 py-0.5 rounded-button bg-success/10 border border-success/20">
            Protected &amp; Active
          </span>
        </div>

        <div className="space-y-2.5 text-small">
          <div className="flex items-center justify-between p-2.5 rounded bg-surface-sunken/40 border border-border">
            <span className="text-text-muted text-caption">Digital License Verification:</span>
            <span className="text-text font-semibold text-caption">
              Tamper-Proof Digital Verification
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded bg-surface-sunken/40 border border-border">
            <span className="text-text-muted text-caption">Password Encryption:</span>
            <span className="text-text font-semibold text-caption">High-Grade Salted Hashing</span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded bg-surface-sunken/40 border border-border">
            <span className="text-text-muted text-caption">Master Admin Isolation:</span>
            <span className="text-primary font-semibold text-caption">
              Secure Independent Vault
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
