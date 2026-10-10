import { useNavigate } from 'react-router';
import { CheckCircle2, ListChecks, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';
import { Button, Breadcrumbs, StatCard } from '@exzaestate/ui';

export interface SetupKpiStats {
  completed: number;
  total: number;
  percentage: number;
  mandatoryPending: number;
}

export function SetupChecklistHeader({
  canTransact,
  onRefresh,
}: {
  canTransact: boolean;
  onRefresh: () => void;
}) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <Breadcrumbs
          items={[
            { label: 'Overview', href: '/dashboard', onClick: () => navigate('/dashboard') },
            { label: 'Workspace & Admin' },
            { label: 'Setup Checklist' },
          ]}
        />
        <div className="flex items-center gap-3 mt-1.5">
          <h1 className="text-h1 font-bold text-text">Company Setup Checklist</h1>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-caption font-semibold border ${
              canTransact
                ? 'bg-success/12 text-success border-success/30'
                : 'bg-warning/12 text-warning border-warning/30'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${canTransact ? 'bg-success' : 'bg-warning'}`}
            />
            {canTransact ? 'Ready for Business' : 'Setup In Progress'}
          </span>
        </div>
        <p className="text-body text-text-muted mt-1">
          Complete the essential setup steps to start recording bookings, payments, and accounting
          transactions.
        </p>
      </div>

      <Button
        variant="secondary"
        size="sm"
        leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        onClick={onRefresh}
      >
        Refresh Status
      </Button>
    </div>
  );
}

export function SetupChecklistKpis({
  kpis,
  canTransact,
}: {
  kpis: SetupKpiStats;
  canTransact: boolean;
}) {
  const hasMandatoryPending = kpis.mandatoryPending > 0;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard
        label="Completion Rate"
        value={`${kpis.percentage}%`}
        variant="brand"
        icon={<CheckCircle2 className="w-4 h-4" />}
      />
      <StatCard
        label="Completed Steps"
        value={`${kpis.completed} / ${kpis.total}`}
        icon={<ListChecks className="w-4 h-4" />}
      />
      <StatCard
        label="Mandatory Pending"
        value={kpis.mandatoryPending}
        variant={hasMandatoryPending ? 'warning' : 'success'}
        icon={<AlertTriangle className="w-4 h-4" />}
      />
      <StatCard
        label="Transact State"
        value={canTransact ? 'Unlocked' : 'Locked'}
        variant={canTransact ? 'success' : 'default'}
        icon={<ShieldCheck className="w-4 h-4" />}
      />
    </div>
  );
}
