import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import {
  Activity,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Lock,
  Search,
  X,
  RefreshCw,
  Download,
  History,
} from 'lucide-react';
import { Button, Select, Breadcrumbs, type SelectOption, StickyToolbar } from '@exzaestate/ui';
import type { AuditLogRecord, SecurityEventRecord } from '../types.js';

export function AuditPageHeader({
  onRefresh,
  onExportCsv,
}: {
  onRefresh: () => void;
  onExportCsv: () => void;
}) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <Breadcrumbs
          items={[
            { label: 'Overview', href: '/dashboard', onClick: () => navigate('/dashboard') },
            { label: 'System & Admin' },
            { label: 'Audit & Security' },
          ]}
        />
        <div className="flex items-center gap-3 mt-1.5">
          <h1 className="text-h1 font-bold text-text">Audit & Security Event Viewer</h1>
          <span className="text-caption font-semibold px-2.5 py-0.5 rounded-full bg-surface-sunken text-primary border border-primary/20">
            Immutable Append-Only Log
          </span>
        </div>
        <p className="text-body text-text-muted mt-1">
          Tamper-evident audit ledger tracking state mutations, privilege changes, and security
          events.
        </p>
      </div>

      <div className="flex items-center gap-2.5">
        <Button
          variant="secondary"
          size="sm"
          onClick={onRefresh}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={onExportCsv}
          leftIcon={<Download className="w-3.5 h-3.5" />}
        >
          Export CSV
        </Button>
      </div>
    </div>
  );
}

export function AuditTabSwitcher({
  activeTab,
  onSelectTab,
}: {
  activeTab: 'audit' | 'security';
  onSelectTab: (tab: 'audit' | 'security') => void;
}) {
  return (
    <div className="flex items-center bg-surface-sunken p-1 rounded-card border border-border w-fit">
      <button
        type="button"
        onClick={() => onSelectTab('audit')}
        className={`flex items-center gap-2 px-4 py-2 text-btn rounded-button transition-colors cursor-pointer ${
          activeTab === 'audit'
            ? 'bg-surface text-text shadow-xs font-semibold'
            : 'text-text-muted hover:text-text'
        }`}
      >
        <History className={`w-4 h-4 ${activeTab === 'audit' ? 'text-primary' : ''}`} />
        <span>Audit Trail (Mutations)</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectTab('security')}
        className={`flex items-center gap-2 px-4 py-2 text-btn rounded-button transition-colors cursor-pointer ${
          activeTab === 'security'
            ? 'bg-surface text-text shadow-xs font-semibold'
            : 'text-text-muted hover:text-text'
        }`}
      >
        <ShieldAlert className={`w-4 h-4 ${activeTab === 'security' ? 'text-primary' : ''}`} />
        <span>Security & Access Events</span>
      </button>
    </div>
  );
}

export interface AuditKpiStats {
  totalMutations: number;
  totalSecurity: number;
  criticalCount: number;
}

export function AuditKpiCards({ stats }: { stats: AuditKpiStats }) {
  const isCritical = stats.criticalCount > 0;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="card-stat">
        <div className="flex items-center justify-between">
          <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
            Total Mutations
          </span>
          <Activity className="w-4 h-4 text-text-muted" />
        </div>
        <span className="text-hero-num font-bold text-text mt-1.5 block tabular-nums">
          {stats.totalMutations} Logged
        </span>
      </div>

      <div className="card-stat">
        <div className="flex items-center justify-between">
          <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
            Security Events
          </span>
          <ShieldCheck className="w-4 h-4 text-primary" />
        </div>
        <span className="text-hero-num font-bold text-primary mt-1.5 block tabular-nums">
          {stats.totalSecurity} Recorded
        </span>
      </div>

      <div className="card-stat">
        <div className="flex items-center justify-between">
          <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
            Critical Alerts
          </span>
          <AlertTriangle className={`w-4 h-4 ${isCritical ? 'text-danger' : 'text-success'}`} />
        </div>
        <span
          className={`text-hero-num font-bold mt-1.5 block tabular-nums ${
            isCritical ? 'text-danger' : 'text-success'
          }`}
        >
          {stats.criticalCount}
        </span>
      </div>

      <div className="card-stat">
        <div className="flex items-center justify-between">
          <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
            Log Retention
          </span>
          <Lock className="w-4 h-4 text-text-muted" />
        </div>
        <span className="text-hero-num font-bold text-text-2 mt-1.5 block">7 Years (WORM)</span>
      </div>
    </div>
  );
}

export interface AuditToolbarProps {
  activeTab: 'audit' | 'security';
  searchTerm: string;
  onSearchChange: (val: string) => void;
  actionFilter: string;
  onActionChange: (val: string) => void;
  recordTypeFilter: string;
  onRecordTypeChange: (val: string) => void;
  severityFilter: string;
  onSeverityChange: (val: string) => void;
  hasActiveFilters: boolean;
  onReset: () => void;
  actionOptions: SelectOption[];
  recordTypeOptions: SelectOption[];
  severityOptions: SelectOption[];
}

export function AuditToolbar(props: AuditToolbarProps): ReactNode {
  const {
    activeTab,
    searchTerm,
    onSearchChange,
    actionFilter,
    onActionChange,
    recordTypeFilter,
    onRecordTypeChange,
    severityFilter,
    onSeverityChange,
    hasActiveFilters,
    onReset,
    actionOptions,
    recordTypeOptions,
    severityOptions,
  } = props;

  return (
    <StickyToolbar>
      <div className="p-3.5 rounded-card border border-border bg-surface shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder={
              activeTab === 'audit'
                ? 'Search by entity, ID, action, reason, actor...'
                : 'Search by event type, severity, user, IP...'
            }
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-9 pl-9 pr-8 text-small rounded-button bg-surface border border-border-input text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-focus focus:border-focus"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text cursor-pointer p-0.5"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {activeTab === 'audit' ? (
            <>
              <div className="w-36">
                <Select options={actionOptions} value={actionFilter} onChange={onActionChange} />
              </div>
              <div className="w-40">
                <Select
                  options={recordTypeOptions}
                  value={recordTypeFilter}
                  onChange={onRecordTypeChange}
                />
              </div>
            </>
          ) : (
            <div className="w-40">
              <Select
                options={severityOptions}
                value={severityFilter}
                onChange={onSeverityChange}
              />
            </div>
          )}

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="text-text-muted hover:text-text text-small whitespace-nowrap"
            >
              Reset
            </Button>
          )}
        </div>
      </div>
    </StickyToolbar>
  );
}

export function matchesAuditSearch(r: AuditLogRecord, term: string): boolean {
  const fields = [r.recordType, r.recordId, r.action, r.actorId, r.reason, r.ipAddress];
  return fields.some((f) => f?.toLowerCase().includes(term));
}

export function matchesSecuritySearch(s: SecurityEventRecord, term: string): boolean {
  const fields = [s.eventType, s.severity, s.userId, s.ipAddress];
  return fields.some((f) => f?.toLowerCase().includes(term));
}
