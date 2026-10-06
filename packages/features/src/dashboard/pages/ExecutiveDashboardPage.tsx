import { useState } from 'react';
import { useNavigate } from 'react-router';
import { RefreshCw, Plus } from 'lucide-react';
import { Button, Select, LoadingState, ErrorState, type SelectOption } from '@exzaestate/ui';
import { useDashboard } from '../hooks/useDashboard.js';
import { ExecutiveKpiStrip } from '../components/ExecutiveKpiStrip.js';
import { InventoryAbsorptionStrip } from '../components/InventoryAbsorptionStrip.js';
import { DashboardChartsSection } from '../components/DashboardChartsSection.js';

const PERIOD_PILLS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'fy', label: 'FY 2026–27' },
];

const PROJECT_OPTIONS: SelectOption[] = [
  { value: '', label: 'All Projects' },
  { value: 'proj_gulshan', label: 'Gulshan North Avenue' },
  { value: 'proj_banani', label: 'Banani Heights' },
  { value: 'proj_dhanmondi', label: 'Dhanmondi Lake View' },
];

export function ExecutiveDashboardPage() {
  const navigate = useNavigate();
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
      {/* Tier 1: Responsive Executive Header & Action Bar */}
      <div className="flex flex-col gap-4 border-b border-border/80 pb-5">
        {/* Title row + Cohesive Action Buttons (Buttons never split or orphan) */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-h1 font-semibold tracking-tight text-text">
                Executive Dashboard
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-caption font-medium bg-surface-sunken text-text-muted border border-border">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                Live Sync
              </span>
            </div>
            <p className="text-small text-text-muted">
              Enterprise property portfolio, sales velocity & financial reconciliation
            </p>
          </div>

          {/* Action Group: Grouped strictly together to prevent wrapping misalignment */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void refetch()}
              className="p-2 rounded-button text-text-muted hover:text-text bg-surface hover:bg-surface-sunken border border-border transition-colors cursor-pointer active:scale-[0.96]"
              title="Refresh metrics"
              aria-label="Refresh dashboard metrics"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <Button variant="secondary" size="sm" onClick={() => navigate('/collection/receipts')}>
              Record Collection
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/sales/bookings')}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              New Booking
            </Button>
          </div>
        </div>

        {/* Filter Toolbar: Segmented Period Pills + Project Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Segmented Period Tabs */}
            <div className="inline-flex items-center p-0.5 rounded-button bg-surface-sunken border border-border">
              {PERIOD_PILLS.map((p) => {
                const isActive = period === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPeriod(p.value)}
                    className={`px-2.5 py-1 text-caption font-medium rounded-[4px] transition-all cursor-pointer active:scale-[0.96] ${
                      isActive
                        ? 'bg-surface text-text shadow-xs border border-border/80 font-semibold'
                        : 'text-text-muted hover:text-text'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Project Selector */}
            <Select
              options={PROJECT_OPTIONS}
              value={projectId}
              onChange={(val) => setProjectId(val)}
              className="text-small min-w-[170px]"
            />
          </div>

          <span className="text-caption text-text-muted hidden lg:inline">
            Reconciled with statutory ledgers (AT-15)
          </span>
        </div>
      </div>

      {/* Tier 2: Real Estate Inventory & Asset Absorption Strip */}
      <InventoryAbsorptionStrip inventory={summary?.inventory} />

      {/* Tier 3: 4 Core Executive KPI Cards with Sparklines */}
      <ExecutiveKpiStrip summary={summary} isLoading={isLoading} />

      {/* Tier 4: Visual Workspace with Custom SVG Charts & Action Center */}
      <DashboardChartsSection summary={summary} salesPerformance={salesPerformance} />
    </div>
  );
}
