import { Server, Database, Activity, RefreshCw } from 'lucide-react';
import type { SystemHealthMetrics } from '../schemas/system-admin.schema.js';

interface ClusterTelemetryConsoleProps {
  health?: SystemHealthMetrics;
  isLoading?: boolean;
  onRefresh?: () => void;
  activeTenantsCount: number;
  suspendedTenantsCount: number;
  totalTenantsCount: number;
  totalLicensesCount: number;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${seconds % 60}s`;
}

function formatMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface ConsoleTopBarProps {
  isHealthy: boolean;
  isLoading?: boolean;
  onRefresh?: () => void;
}

function ConsoleTopBar({ isHealthy, isLoading, onRefresh }: ConsoleTopBarProps) {
  return (
    <div className="px-5 py-3.5 border-b border-border bg-surface flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span
              className={`absolute inline-flex h-full w-full animate-ping rounded-full ${
                isHealthy ? 'bg-success opacity-75' : 'bg-danger opacity-75'
              }`}
            />
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${
                isHealthy ? 'bg-success' : 'bg-danger'
              }`}
            />
          </span>
          <span className="font-semibold text-text text-small tracking-tight">
            Cluster Architecture & Node State
          </span>
        </div>
        <span className="text-caption font-mono text-text-muted px-2 py-0.5 rounded-button bg-surface-sunken border border-border">
          {isHealthy ? 'CLUSTER_HEALTHY' : 'CLUSTER_DEGRADED'}
        </span>
      </div>

      <div className="flex items-center gap-3 text-caption text-text-muted">
        <span className="hidden sm:inline">Telemetry auto-refreshes every 15s</span>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="p-1 rounded text-text-muted hover:text-text hover:bg-surface-sunken cursor-pointer transition active:scale-[0.96]"
            title="Refresh telemetry"
            aria-label="Refresh telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
    </div>
  );
}

function DatabaseTelemetryCard({ health }: { health?: SystemHealthMetrics }) {
  const backupText = health?.backupStatus.status || 'Verified Clean';

  return (
    <div className="p-5 space-y-3">
      <div className="flex items-center justify-between text-caption text-text-muted font-medium">
        <span className="flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-primary" />
          Database Engine
        </span>
        <span className="text-success font-semibold">RLS Enforced</span>
      </div>

      <div>
        <div className="text-h2 font-semibold text-text tracking-tight">PostgreSQL 18</div>
        <p className="text-caption text-text-muted mt-0.5">
          Multi-tenant isolated with session-level tenant switching
        </p>
      </div>

      <div className="pt-2 border-t border-border/60 flex items-center justify-between text-caption">
        <span className="text-text-muted">Backup Snapshot</span>
        <span className="font-mono text-text font-medium">{backupText}</span>
      </div>
    </div>
  );
}

function MemoryTelemetryCard({ health }: { health?: SystemHealthMetrics }) {
  const heapUsed = health?.memory.heapUsed ?? 0;
  const heapTotal = health?.memory.heapTotal ?? 1;
  const rss = health?.memory.rss ?? 0;
  const memoryPct = Math.min(100, Math.round((heapUsed / heapTotal) * 100));

  return (
    <div className="p-5 space-y-3">
      <div className="flex items-center justify-between text-caption text-text-muted font-medium">
        <span className="flex items-center gap-1.5">
          <Server className="w-3.5 h-3.5 text-primary" />
          Node.js Memory
        </span>
        <span className="font-mono tabular-nums text-text font-semibold">{memoryPct}% used</span>
      </div>

      <div>
        <div className="text-h2 font-semibold text-text tracking-tight tabular-nums">
          {formatMb(heapUsed)}
          <span className="text-caption font-normal text-text-muted ml-2">
            / {formatMb(heapTotal)}
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-surface-sunken overflow-hidden mt-2">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${memoryPct}%` }}
          />
        </div>
      </div>

      <div className="pt-2 border-t border-border/60 flex items-center justify-between text-caption">
        <span className="text-text-muted">Total Resident Set (RSS)</span>
        <span className="font-mono tabular-nums text-text font-medium">{formatMb(rss)}</span>
      </div>
    </div>
  );
}

function JobDispatcherTelemetryCard({ health }: { health?: SystemHealthMetrics }) {
  const inFlight = (health?.queueDepth.active ?? 0) + (health?.queueDepth.pending ?? 0);
  const uptimeStr = health ? formatUptime(health.uptime) : '—';
  const queueStats = `${health?.queueDepth.completed ?? 0} / ${health?.queueDepth.failed ?? 0}`;

  return (
    <div className="p-5 space-y-3">
      <div className="flex items-center justify-between text-caption text-text-muted font-medium">
        <span className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-primary" />
          Job Dispatcher
        </span>
        <span className="font-mono tabular-nums text-text">Uptime: {uptimeStr}</span>
      </div>

      <div>
        <div className="text-h2 font-semibold text-text tracking-tight tabular-nums">
          {inFlight}
          <span className="text-caption font-normal text-text-muted ml-2">jobs in flight</span>
        </div>
        <p className="text-caption text-text-muted mt-0.5">
          BullMQ Redis worker pool & outbox event processor
        </p>
      </div>

      <div className="pt-2 border-t border-border/60 flex items-center justify-between text-caption">
        <span className="text-text-muted">Completed / Failed</span>
        <span className="font-mono tabular-nums text-text font-medium">{queueStats}</span>
      </div>
    </div>
  );
}

interface ClusterRegistryRibbonProps {
  activeTenantsCount: number;
  suspendedTenantsCount: number;
  totalTenantsCount: number;
  totalLicensesCount: number;
}

function ClusterRegistryRibbon({
  activeTenantsCount,
  suspendedTenantsCount,
  totalTenantsCount,
  totalLicensesCount,
}: ClusterRegistryRibbonProps) {
  return (
    <div className="px-5 py-3 bg-surface-sunken/40 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-4 text-small">
      <div className="flex items-center justify-between sm:justify-start sm:gap-2">
        <span className="text-text-muted text-caption">Total Tenants:</span>
        <span className="font-semibold text-text tabular-nums">{totalTenantsCount}</span>
      </div>

      <div className="flex items-center justify-between sm:justify-start sm:gap-2">
        <span className="text-text-muted text-caption">Active Workspaces:</span>
        <span className="font-semibold text-success tabular-nums">{activeTenantsCount}</span>
      </div>

      <div className="flex items-center justify-between sm:justify-start sm:gap-2">
        <span className="text-text-muted text-caption">Suspended:</span>
        <span className="font-semibold text-danger tabular-nums">{suspendedTenantsCount}</span>
      </div>

      <div className="flex items-center justify-between sm:justify-start sm:gap-2">
        <span className="text-text-muted text-caption">Active Licenses:</span>
        <span className="font-semibold text-primary tabular-nums">{totalLicensesCount}</span>
      </div>
    </div>
  );
}

export function ClusterTelemetryConsole({
  health,
  isLoading,
  onRefresh,
  activeTenantsCount,
  suspendedTenantsCount,
  totalTenantsCount,
  totalLicensesCount,
}: ClusterTelemetryConsoleProps) {
  const isHealthy = health?.status === 'ok';

  return (
    <div className="rounded-card border border-border bg-surface shadow-xs overflow-hidden">
      <ConsoleTopBar isHealthy={isHealthy} isLoading={isLoading} onRefresh={onRefresh} />

      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
        <DatabaseTelemetryCard health={health} />
        <MemoryTelemetryCard health={health} />
        <JobDispatcherTelemetryCard health={health} />
      </div>

      <ClusterRegistryRibbon
        activeTenantsCount={activeTenantsCount}
        suspendedTenantsCount={suspendedTenantsCount}
        totalTenantsCount={totalTenantsCount}
        totalLicensesCount={totalLicensesCount}
      />
    </div>
  );
}
