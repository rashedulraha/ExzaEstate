import { Activity, Clock, Cpu, ShieldCheck } from 'lucide-react';

export interface PlatformHealthVitalsStripProps {
  isHealthy: boolean;
  uptimeStr: string;
  rssMb: string;
}

export function PlatformHealthVitalsStrip({
  isHealthy,
  uptimeStr,
  rssMb,
}: PlatformHealthVitalsStripProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="rounded-card border border-border bg-surface p-4 shadow-xs">
        <div className="flex items-center justify-between text-caption text-text-muted font-medium mb-1">
          <span>Overall Server Status</span>
          <Activity className="w-4 h-4 text-primary" />
        </div>
        <div className="text-h2 font-semibold text-text tracking-tight flex items-center gap-2">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${isHealthy ? 'bg-success' : 'bg-danger'}`}
          />
          {isHealthy ? 'Operational' : 'Attention Needed'}
        </div>
        <div className="text-caption text-text-muted mt-1">
          All platform services are running smoothly
        </div>
      </div>

      <div className="rounded-card border border-border bg-surface p-4 shadow-xs">
        <div className="flex items-center justify-between text-caption text-text-muted font-medium mb-1">
          <span>System Uptime</span>
          <Clock className="w-4 h-4 text-primary" />
        </div>
        <div className="text-h2 font-semibold text-text tracking-tight font-mono tabular-nums">
          {uptimeStr}
        </div>
        <div className="text-caption text-text-muted mt-1">
          Continuous runtime without interruption
        </div>
      </div>

      <div className="rounded-card border border-border bg-surface p-4 shadow-xs">
        <div className="flex items-center justify-between text-caption text-text-muted font-medium mb-1">
          <span>Server Memory Allocation</span>
          <Cpu className="w-4 h-4 text-primary" />
        </div>
        <div className="text-h2 font-semibold text-text tracking-tight font-mono tabular-nums">
          {rssMb}
        </div>
        <div className="text-caption text-text-muted mt-1">
          Total active memory in use by server
        </div>
      </div>

      <div className="rounded-card border border-border bg-surface p-4 shadow-xs">
        <div className="flex items-center justify-between text-caption text-text-muted font-medium mb-1">
          <span>Company Data Isolation</span>
          <ShieldCheck className="w-4 h-4 text-success" />
        </div>
        <div className="text-h2 font-semibold text-success tracking-tight">
          Strict &amp; Protected
        </div>
        <div className="text-caption text-text-muted mt-1">
          Each company&apos;s data is completely private
        </div>
      </div>
    </div>
  );
}
