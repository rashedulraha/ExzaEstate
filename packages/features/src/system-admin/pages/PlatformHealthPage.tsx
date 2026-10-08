import { useNavigate } from 'react-router';
import { useToast, Breadcrumbs } from '@exzaestate/ui';
import { useSystemAdmin } from '../hooks/useSystemAdmin.js';
import type { SystemHealthData } from '../schemas/system-admin.schema.js';
import { PlatformHealthHeader } from '../components/PlatformHealthHeader.js';
import { PlatformHealthVitalsStrip } from '../components/PlatformHealthVitalsStrip.js';
import { PlatformHealthInspectionPanels } from '../components/PlatformHealthInspectionPanels.js';

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

function computeHealthMetrics(health: SystemHealthData | null | undefined) {
  if (!health) {
    return {
      isHealthy: false,
      heapUsedMb: '0.0 MB',
      heapTotalMb: '1.0 MB',
      rssMb: '0.0 MB',
      externalMb: '0.0 MB',
      memoryPct: 0,
      inFlight: 0,
      completedJobs: 0,
      failedJobs: 0,
      uptimeStr: '—',
      backupText: 'Up to Date',
    };
  }
  const heapUsed = health.memory.heapUsed;
  const heapTotal = health.memory.heapTotal;
  return {
    isHealthy: health.status === 'ok',
    heapUsedMb: formatMb(heapUsed),
    heapTotalMb: formatMb(heapTotal),
    rssMb: formatMb(health.memory.rss),
    externalMb: formatMb(health.memory.external),
    memoryPct: Math.min(100, Math.round((heapUsed / heapTotal) * 100)),
    inFlight: health.queueDepth.active + health.queueDepth.pending,
    completedJobs: health.queueDepth.completed,
    failedJobs: health.queueDepth.failed,
    uptimeStr: formatUptime(health.uptime),
    backupText: health.backupStatus.status,
  };
}

export function PlatformHealthPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { health, isLoadingHealth, refetchHealth } = useSystemAdmin();

  const handleRefresh = async () => {
    await refetchHealth();
    showToast({
      title: 'Status Refreshed',
      description: 'System health metrics and server performance updated.',
      family: 'info',
    });
  };

  const metrics = computeHealthMetrics(health);

  return (
    <div className="container-page space-y-6">
      <Breadcrumbs
        items={[
          {
            label: 'Overview Dashboard',
            href: '/system/dashboard',
            onClick: () => navigate('/system/dashboard'),
          },
          { label: 'System & Server Health' },
          { label: 'System Status & Performance' },
        ]}
      />

      <PlatformHealthHeader
        isHealthy={metrics.isHealthy}
        isLoading={isLoadingHealth}
        onRefresh={() => void handleRefresh()}
      />

      <PlatformHealthVitalsStrip
        isHealthy={metrics.isHealthy}
        uptimeStr={metrics.uptimeStr}
        rssMb={metrics.rssMb}
      />

      <PlatformHealthInspectionPanels
        memoryPct={metrics.memoryPct}
        heapUsedMb={metrics.heapUsedMb}
        heapTotalMb={metrics.heapTotalMb}
        externalMb={metrics.externalMb}
        backupText={metrics.backupText}
        inFlight={metrics.inFlight}
        completedJobs={metrics.completedJobs}
        failedJobs={metrics.failedJobs}
      />
    </div>
  );
}
