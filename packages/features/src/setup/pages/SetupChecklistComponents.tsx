import { useNavigate } from 'react-router';
import { CheckCircle2, ListChecks, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';
import { Button, Breadcrumbs } from '@exzaestate/ui';

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
            { label: 'System & Admin' },
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
            {canTransact ? 'Transact Ready' : 'Setup In Progress'}
          </span>
        </div>
        <p className="text-body text-text-muted mt-1">
          Enterprise first-time setup checklist per FLOW-02. Complete mandatory items to enable
          financial operations.
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
      <div className="card-stat">
        <div className="flex items-center justify-between">
          <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
            Completion Rate
          </span>
          <CheckCircle2 className="w-4 h-4 text-primary" />
        </div>
        <span className="text-hero-num font-bold text-primary mt-1.5 block tabular-nums">
          {kpis.percentage}%
        </span>
      </div>

      <div className="card-stat">
        <div className="flex items-center justify-between">
          <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
            Satisfied Steps
          </span>
          <ListChecks className="w-4 h-4 text-text-muted" />
        </div>
        <span className="text-hero-num font-bold text-text mt-1.5 block tabular-nums">
          {kpis.completed} / {kpis.total}
        </span>
      </div>

      <div className="card-stat">
        <div className="flex items-center justify-between">
          <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
            Mandatory Pending
          </span>
          <AlertTriangle
            className={`w-4 h-4 ${hasMandatoryPending ? 'text-warning' : 'text-success'}`}
          />
        </div>
        <span
          className={`text-hero-num font-bold mt-1.5 block tabular-nums ${
            hasMandatoryPending ? 'text-warning' : 'text-success'
          }`}
        >
          {kpis.mandatoryPending}
        </span>
      </div>

      <div className="card-stat">
        <div className="flex items-center justify-between">
          <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
            Transact State
          </span>
          <ShieldCheck className={`w-4 h-4 ${canTransact ? 'text-success' : 'text-text-muted'}`} />
        </div>
        <span
          className={`text-hero-num font-bold mt-1.5 block ${
            canTransact ? 'text-success' : 'text-text-muted'
          }`}
        >
          {canTransact ? 'Unlocked' : 'Locked'}
        </span>
      </div>
    </div>
  );
}
