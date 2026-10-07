import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  RefreshCw,
  Plus,
  CreditCard,
  Building2,
  Users,
  FileSpreadsheet,
  Receipt,
  Landmark,
  TrendingUp,
} from 'lucide-react';
import { Button, Select, LoadingState, ErrorState, type SelectOption } from '@exzaestate/ui';
import { useProjectControllerListProjects } from '@exzaestate/api-client';
import { useDashboard } from '../hooks/useDashboard.js';
import { ExecutivePortfolioHero } from '../components/ExecutivePortfolioHero.js';
import { ExecutiveKpiStrip } from '../components/ExecutiveKpiStrip.js';
import { InventoryAbsorptionStrip } from '../components/InventoryAbsorptionStrip.js';
import { DashboardChartsSection } from '../components/DashboardChartsSection.js';

interface ProjectListItem {
  id: string;
  name: string;
  code?: string;
}

interface ProjectListResult {
  items?: ProjectListItem[];
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PERIOD_PILLS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'fy', label: 'FY 2026–27' },
];

interface ExecutiveHeaderProps {
  isLoading: boolean;
  onRefresh: () => void;
  onNavigate: (path: string) => void;
}

function ExecutiveHeader({ isLoading, onRefresh, onNavigate }: ExecutiveHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-text-muted">
            Enterprise Cockpit · Real Estate Portfolio
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-caption font-semibold bg-surface-sunken text-text-muted border border-border">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Live Sync
          </span>
        </div>
        <h1 className="text-h1 font-bold tracking-tight text-text font-sans">
          Executive Dashboard
        </h1>
        <p className="text-small text-text-muted">
          Consolidated property portfolio, sales velocity, and statutory financial reconciliation.
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onRefresh}
          className="p-2 rounded-button text-text-muted hover:text-text bg-surface hover:bg-surface-sunken border border-border transition-all cursor-pointer active:scale-[0.96]"
          title="Refresh metrics"
          aria-label="Refresh dashboard metrics"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`} />
        </button>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => onNavigate('/collection/receipts')}
          leftIcon={<CreditCard className="w-3.5 h-3.5" />}
        >
          Record Collection
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={() => onNavigate('/sales/bookings')}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
        >
          New Booking
        </Button>
      </div>
    </div>
  );
}

interface FilterToolbarProps {
  period: string;
  onPeriodChange: (val: string) => void;
  projectId: string;
  onProjectChange: (val: string) => void;
  projectOptions: SelectOption[];
  isLoadingProjects?: boolean;
}

function FilterToolbar({
  period,
  onPeriodChange,
  projectId,
  onProjectChange,
  projectOptions,
  isLoadingProjects,
}: FilterToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="inline-flex items-center p-0.5 rounded-button bg-surface-sunken border border-border">
          {PERIOD_PILLS.map((p) => {
            const isActive = period === p.value;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => onPeriodChange(p.value)}
                className={`px-2.5 py-1 text-caption rounded-[4px] transition-all cursor-pointer active:scale-[0.96] ${
                  isActive
                    ? 'bg-surface text-text border border-border/80 font-bold'
                    : 'text-text-muted hover:text-text font-medium'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <Select
          options={projectOptions}
          value={projectId}
          onChange={onProjectChange}
          disabled={isLoadingProjects}
          className="text-small min-w-[200px]"
        />
      </div>

      <span className="text-caption text-text-muted hidden lg:inline font-mono">
        Reconciled with statutory ledgers (AT-15)
      </span>
    </div>
  );
}

function QuickWorkflowDeck({ onNavigate }: { onNavigate: (path: string) => void }) {
  const links = [
    { label: 'Property Inventory', path: '/properties', icon: Building2 },
    { label: 'Customers KYC', path: '/customers', icon: Users },
    { label: 'Price Quotations', path: '/sales/quotations', icon: FileSpreadsheet },
    { label: 'Contracts & Bookings', path: '/sales/bookings', icon: Receipt },
    { label: 'Money Receipts', path: '/collection/receipts', icon: CreditCard },
    { label: 'General Ledger', path: '/accounting/coa', icon: Landmark },
    { label: 'Statutory Reports', path: '/reports', icon: TrendingUp },
  ];

  return (
    <div className="rounded-card border border-border bg-surface p-4 space-y-2.5">
      <div className="flex items-center justify-between text-caption text-text-muted font-medium">
        <span className="font-mono uppercase tracking-wider text-[11px] font-semibold">
          Executive Workflow Fast-Track
        </span>
        <span className="hidden sm:inline">Instant jump to core lifecycle stages</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <button
              key={link.path}
              type="button"
              onClick={() => onNavigate(link.path)}
              className="flex items-center gap-2 px-2.5 py-2 rounded-button bg-surface hover:bg-surface-sunken border border-border hover:border-primary/40 text-text transition-all text-[12px] font-medium cursor-pointer active:scale-[0.98] group"
            >
              <Icon className="w-3.5 h-3.5 text-text-muted group-hover:text-primary transition-colors shrink-0" />
              <span className="truncate">{link.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function buildProjectOptions(
  projects: Array<{ id?: string; name?: string; code?: string }>,
): SelectOption[] {
  const list: SelectOption[] = [{ value: '', label: 'All Projects' }];
  for (const p of projects) {
    if (p.id) {
      list.push({
        value: p.id,
        label: p.name ?? p.code ?? 'Unnamed Project',
      });
    }
  }
  return list;
}

function resolveValidProjectId(id: string): string | undefined {
  if (!id) {
    return undefined;
  }
  return UUID_REGEX.test(id) ? id : undefined;
}

function FilterErrorAlert({ error, onReset }: { error: unknown; onReset: () => void }) {
  const message =
    error instanceof Error ? error.message : 'Failed to load filtered dashboard metrics.';
  return (
    <div
      role="alert"
      className="rounded-card border border-danger/30 bg-danger/10 px-4 py-3 flex items-center justify-between text-danger text-small"
    >
      <span>{message}</span>
      <Button variant="secondary" size="sm" onClick={onReset}>
        Reset to All Projects
      </Button>
    </div>
  );
}

export function ExecutiveDashboardPage() {
  const navigate = useNavigate();
  const [projectId, setProjectId] = useState<string>('');
  const [period, setPeriod] = useState<string>('30d');

  // Query real projects from API to populate project filter dropdown with real database UUIDs
  const projectsQuery = useProjectControllerListProjects({ limit: 100 });
  const projectListResult = projectsQuery.data as ProjectListResult | undefined;
  const rawProjects = projectListResult?.items ?? [];

  const projectOptions: SelectOption[] = useMemo(
    () => buildProjectOptions(rawProjects),
    [rawProjects],
  );

  const validProjectId = resolveValidProjectId(projectId);

  const { summary, salesPerformance, isLoading, isError, error, refetch } = useDashboard({
    projectId: validProjectId,
  });

  // Centered Loading State
  if (isLoading && !summary) {
    return (
      <div className="flex-1 min-h-[calc(100vh-160px)] flex items-center justify-center p-6">
        <div className="w-full max-w-4xl">
          <LoadingState variant="cards" />
        </div>
      </div>
    );
  }

  // Centered Error State: Vertically and Horizontally in middle of viewport
  if (isError && !summary) {
    return (
      <div className="flex-1 min-h-[calc(100vh-160px)] flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <ErrorState
            title="Failed to load dashboard"
            message={error instanceof Error ? error.message : 'An unexpected error occurred.'}
            onRetry={() => {
              setProjectId('');
              void refetch();
            }}
          />
        </div>
      </div>
    );
  }

  const handleResetFilter = () => {
    setProjectId('');
    void refetch();
  };

  return (
    <div className="container-page space-y-6">
      {/* Tier 1: Luxury Executive Header & Action Bar */}
      <div className="flex flex-col gap-4 border-b border-border/80 pb-5">
        <ExecutiveHeader
          isLoading={isLoading}
          onRefresh={() => void refetch()}
          onNavigate={navigate}
        />

        <FilterToolbar
          period={period}
          onPeriodChange={setPeriod}
          projectId={projectId}
          onProjectChange={setProjectId}
          projectOptions={projectOptions}
          isLoadingProjects={projectsQuery.isLoading}
        />
      </div>

      {/* Graceful Inline Error Recovery if Filter Fails with Active Data */}
      {isError && <FilterErrorAlert error={error} onReset={handleResetFilter} />}

      {/* Tier 2: Master Portfolio Spotlight Hero Deck */}
      <ExecutivePortfolioHero summary={summary} onNavigate={navigate} />

      {/* Tier 3: 4 Core Executive KPI Cards with Sparklines & Icon Badges */}
      <ExecutiveKpiStrip summary={summary} isLoading={isLoading} />

      {/* Tier 4: Real Estate Inventory & Asset Absorption Strip */}
      <InventoryAbsorptionStrip inventory={summary?.inventory} />

      {/* Tier 5: Visual Analytics Workspace with SVG Charts & Action Center */}
      <DashboardChartsSection summary={summary} salesPerformance={salesPerformance} />

      {/* Tier 6: Executive Fast-Track Workflow Deck */}
      <QuickWorkflowDeck onNavigate={navigate} />
    </div>
  );
}
