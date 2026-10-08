import { useNavigate } from 'react-router';
import { ShieldCheck, RefreshCw, Lock, FileText, Activity } from 'lucide-react';
import { useToast, Breadcrumbs, Button, LoadingState } from '@exzaestate/ui';
import { useSystemAdmin } from '../hooks/useSystemAdmin.js';
import { PlatformAuditLogsTable } from '../components/PlatformAuditLogsTable.js';

export function PlatformAuditPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { auditLogs, isLoadingAuditLogs, refetchAuditLogs } = useSystemAdmin();

  const handleRefresh = async () => {
    await refetchAuditLogs();
    showToast({
      title: 'Audit Trail Refreshed',
      description: 'Platform audit logs synchronized from PostgreSQL ledger.',
      family: 'info',
    });
  };

  if (isLoadingAuditLogs && auditLogs.length === 0) {
    return <LoadingState variant="cards" />;
  }

  const tenantEventsCount = auditLogs.filter((l) => l.action.startsWith('TENANT_')).length;
  const systemEventsCount = auditLogs.filter(
    (l) => l.companyCode === 'SYSTEM' || l.action.startsWith('SYSTEM_'),
  ).length;

  return (
    <div className="container-page space-y-6">
      {/* Breadcrumbs */}
      <div>
        <Breadcrumbs
          items={[
            {
              label: 'Overview Dashboard',
              href: '/system/dashboard',
              onClick: () => navigate('/system/dashboard'),
            },
            { label: 'Platform Overview' },
            { label: 'Activity & Audit Log' },
          ]}
        />
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-h1 font-semibold tracking-tight text-text">
              System Activity &amp; Audit Log
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-caption font-medium bg-primary/10 text-primary border border-primary/20">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Permanent History
            </span>
          </div>
          <p className="text-small text-text-muted">
            Permanent, verifiable record of all company registrations, status changes, software
            licenses, and administrator actions.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void handleRefresh()}
            leftIcon={
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAuditLogs ? 'animate-spin' : ''}`} />
            }
          >
            Refresh Activity Log
          </Button>
        </div>
      </div>

      {/* Metric Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-card border border-border bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between text-caption text-text-muted font-medium mb-1">
            <span>Total Recorded Actions</span>
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <div className="text-h1 font-semibold text-text tracking-tight font-mono tabular-nums">
            {auditLogs.length}
          </div>
          <div className="text-caption text-text-muted mt-1">All logged platform activities</div>
        </div>

        <div className="rounded-card border border-border bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between text-caption text-text-muted font-medium mb-1">
            <span>Company Account Actions</span>
            <Activity className="w-4 h-4 text-success" />
          </div>
          <div className="text-h1 font-semibold text-success tracking-tight font-mono tabular-nums">
            {tenantEventsCount}
          </div>
          <div className="text-caption text-text-muted mt-1">
            Registrations, suspensions, reactivations
          </div>
        </div>

        <div className="rounded-card border border-border bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between text-caption text-text-muted font-medium mb-1">
            <span>Administrator Activities</span>
            <ShieldCheck className="w-4 h-4 text-primary" />
          </div>
          <div className="text-h1 font-semibold text-primary tracking-tight font-mono tabular-nums">
            {systemEventsCount}
          </div>
          <div className="text-caption text-text-muted mt-1">System scans and admin logins</div>
        </div>

        <div className="rounded-card border border-border bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between text-caption text-text-muted font-medium mb-1">
            <span>Data Protection</span>
            <Lock className="w-4 h-4 text-text-muted" />
          </div>
          <div className="text-h1 font-semibold text-text tracking-tight">Permanent &amp; Safe</div>
          <div className="text-caption text-text-muted mt-1">
            Records cannot be modified or deleted
          </div>
        </div>
      </div>

      {/* Main Table */}
      <PlatformAuditLogsTable logs={auditLogs} isLoading={isLoadingAuditLogs} />
    </div>
  );
}
