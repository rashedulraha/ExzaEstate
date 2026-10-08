import { Activity, Server, Database, Clock } from 'lucide-react';
import type { SystemHealthMetrics } from '../schemas/system-admin.schema.js';

interface SystemHealthCardGridProps {
  health?: SystemHealthMetrics;
  isLoading?: boolean;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${seconds % 60}s`;
}

function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

function PlatformStatusCard({ health, isLoading }: SystemHealthCardGridProps) {
  const isHealthy = health?.status === 'ok';
  const uptimeStr = health ? formatUptime(health.uptime) : '—';

  return (
    <div className="rounded-card border border-border bg-surface p-4 shadow-xs transition hover:shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-caption font-medium text-text-muted">Server Status</span>
        <span className="p-1.5 rounded-button bg-surface-sunken text-primary">
          <Activity className="w-4 h-4" />
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        {isLoading || !health ? (
          <div className="h-6 w-20 animate-skeleton-breathe rounded-button bg-surface-sunken" />
        ) : (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-caption font-medium ${
              isHealthy
                ? 'bg-success/10 text-success border border-success/20'
                : 'bg-danger/10 text-danger border border-danger/20'
            }`}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full ${
                  isHealthy ? 'bg-success opacity-75' : 'bg-danger opacity-75'
                }`}
              />
              <span
                className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
                  isHealthy ? 'bg-success' : 'bg-danger'
                }`}
              />
            </span>
            {isHealthy ? 'Operational · Running' : 'Needs Attention'}
          </span>
        )}
      </div>
      <div className="mt-2 text-caption text-text-muted flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" />
        <span>Continuous Run Time:</span>
        <span className="font-medium text-text tabular-nums">{uptimeStr}</span>
      </div>
    </div>
  );
}

function MemoryFootprintCard({ health, isLoading }: SystemHealthCardGridProps) {
  const rssStr = health ? formatBytes(health.memory.rss) : '—';

  return (
    <div className="rounded-card border border-border bg-surface p-4 shadow-xs transition hover:shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-caption font-medium text-text-muted">Server Memory Usage</span>
        <span className="p-1.5 rounded-button bg-surface-sunken text-primary">
          <Server className="w-4 h-4" />
        </span>
      </div>
      <div className="mt-3">
        {isLoading || !health ? (
          <div className="h-6 w-24 animate-skeleton-breathe rounded-button bg-surface-sunken" />
        ) : (
          <div className="text-h2 font-semibold text-text tabular-nums">
            {formatBytes(health.memory.heapUsed)}
            <span className="text-caption font-normal text-text-muted ml-1.5">
              / {formatBytes(health.memory.heapTotal)}
            </span>
          </div>
        )}
      </div>
      <div className="mt-2 text-caption text-text-muted flex items-center justify-between">
        <span>Total System Memory:</span>
        <span className="font-medium text-text tabular-nums">{rssStr}</span>
      </div>
    </div>
  );
}

function QueueDispatcherCard({ health, isLoading }: SystemHealthCardGridProps) {
  const inFlight = health ? health.queueDepth.active + health.queueDepth.pending : 0;
  const queueStats = health
    ? `${health.queueDepth.completed} / ${health.queueDepth.failed}`
    : '0 / 0';

  return (
    <div className="rounded-card border border-border bg-surface p-4 shadow-xs transition hover:shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-caption font-medium text-text-muted">Background Tasks & Sync</span>
        <span className="p-1.5 rounded-button bg-surface-sunken text-primary">
          <Activity className="w-4 h-4" />
        </span>
      </div>
      <div className="mt-3">
        {isLoading || !health ? (
          <div className="h-6 w-16 animate-skeleton-breathe rounded-button bg-surface-sunken" />
        ) : (
          <div className="text-h2 font-semibold text-text tabular-nums">
            {inFlight}
            <span className="text-caption font-normal text-text-muted ml-1.5">processing</span>
          </div>
        )}
      </div>
      <div className="mt-2 text-caption text-text-muted flex items-center justify-between">
        <span>Done / Failed:</span>
        <span className="font-medium text-text tabular-nums">{queueStats}</span>
      </div>
    </div>
  );
}

function DatabaseStatusCard({ health, isLoading }: SystemHealthCardGridProps) {
  const backupText = health?.backupStatus?.status || '—';

  return (
    <div className="rounded-card border border-border bg-surface p-4 shadow-xs transition hover:shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-caption font-medium text-text-muted">Database & Storage</span>
        <span className="p-1.5 rounded-button bg-surface-sunken text-primary">
          <Database className="w-4 h-4" />
        </span>
      </div>
      <div className="mt-3">
        {isLoading || !health ? (
          <div className="h-6 w-20 animate-skeleton-breathe rounded-button bg-surface-sunken" />
        ) : (
          <span className="inline-flex items-center gap-1.5 text-caption font-semibold text-success">
            <span className="h-2 w-2 rounded-full bg-success" />
            Connected · Protected
          </span>
        )}
      </div>
      <div className="mt-2 text-caption text-text-muted flex items-center justify-between">
        <span>Automated Backup:</span>
        <span className="font-medium text-text">{backupText}</span>
      </div>
    </div>
  );
}

export function SystemHealthCardGrid({ health, isLoading }: SystemHealthCardGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <PlatformStatusCard health={health} isLoading={isLoading} />
      <MemoryFootprintCard health={health} isLoading={isLoading} />
      <QueueDispatcherCard health={health} isLoading={isLoading} />
      <DatabaseStatusCard health={health} isLoading={isLoading} />
    </div>
  );
}
