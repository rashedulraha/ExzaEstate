import { useState } from 'react';
import { RefreshCw, Calendar, Filter } from 'lucide-react';
import { Button, Select, LoadingState, ErrorState, type SelectOption } from '@exzaestate/ui';
import { useDashboard } from '../hooks/useDashboard.js';
import { ExecutiveKpiStrip } from '../components/ExecutiveKpiStrip.js';
import { DashboardChartsSection } from '../components/DashboardChartsSection.js';

const PERIOD_OPTIONS: SelectOption[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'fy', label: 'FY 2026–27' },
];

const PROJECT_OPTIONS: SelectOption[] = [
  { value: '', label: 'All Projects' },
  { value: 'proj_gulshan', label: 'Gulshan North Avenue' },
  { value: 'proj_banani', label: 'Banani Heights' },
  { value: 'proj_dhanmondi', label: 'Dhanmondi Lake View' },
];

export function ExecutiveDashboardPage() {
  const [projectId, setProjectId] = useState<string>('');
  const [period, setPeriod] = useState<string>('30d');

  const { summary, salesPerformance, isLoading, isError, error, refetch } = useDashboard({
    projectId: projectId || undefined,
  });

  if (isLoading && !summary) {
    return <LoadingState variant="cards" />;
  }

  if (isError && !summary) {
    return (
      <ErrorState
        title="Failed to load dashboard"
        message={error instanceof Error ? error.message : 'An unexpected error occurred.'}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Tier 1: Action Header & Global Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-heading-2 text-text font-semibold">Executive Dashboard</h1>
          <p className="text-caption text-text-muted mt-0.5">
            Real-time management overview · KPIs computed identically to statutory reports (AT-15)
          </p>
        </div>

        {/* Controls Strip */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Period selector */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-text-muted" aria-hidden="true" />
            <Select
              options={PERIOD_OPTIONS}
              value={period}
              onChange={(val) => setPeriod(val)}
              className="text-small min-w-[130px]"
            />
          </div>

          {/* Project filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-text-muted" aria-hidden="true" />
            <Select
              options={PROJECT_OPTIONS}
              value={projectId}
              onChange={(val) => setProjectId(val)}
              className="text-small min-w-[160px]"
            />
          </div>

          {/* Refresh Action */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void refetch()}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Tier 2: 4 Core Executive KPI Cards with Sparklines */}
      <ExecutiveKpiStrip summary={summary} isLoading={isLoading} />

      {/* Tier 3: Visual Workspace with Custom SVG Charts */}
      <DashboardChartsSection summary={summary} salesPerformance={salesPerformance} />
    </div>
  );
}
