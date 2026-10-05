import { useState, useMemo } from 'react';
import { ShieldCheck, ShieldAlert, Download, RefreshCw, Lock } from 'lucide-react';
import { Button, Select, type SelectOption } from '@exzaestate/ui';
import {
  useAuditControllerGetAuditLogs,
  useAuditControllerGetSecurityEvents,
} from '@exzaestate/api-client';
import type { AuditLogRecord, SecurityEventRecord } from '../types.js';
import { AuditDetailDrawer } from '../components/AuditDetailDrawer.js';
import { buildAuditColumns, SECURITY_COLUMNS } from './audit-columns.js';
import { AuditTrailPanel, SecurityEventsPanel } from './AuditTabPanels.js';

const ACTION_OPTIONS: SelectOption[] = [
  { value: '', label: 'All Actions' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'post', label: 'Post' },
  { value: 'reverse', label: 'Reverse' },
];

const RECORD_TYPE_OPTIONS: SelectOption[] = [
  { value: '', label: 'All Entities' },
  { value: 'booking', label: 'Booking' },
  { value: 'customer', label: 'Customer' },
  { value: 'payment', label: 'Payment' },
  { value: 'journal', label: 'Journal' },
  { value: 'voucher', label: 'Voucher' },
  { value: 'user', label: 'User' },
];

const SEVERITY_OPTIONS: SelectOption[] = [
  { value: '', label: 'All Severities' },
  { value: 'INFO', label: 'Info' },
  { value: 'WARN', label: 'Warning' },
  { value: 'ERROR', label: 'Error' },
  { value: 'CRITICAL', label: 'Critical' },
];

function getExportEndpoint(activeTab: 'audit' | 'security'): string {
  if (activeTab === 'security') {
    return '/api/v1/audit-logs/security-events/export';
  }
  return '/api/v1/audit-logs/export';
}

function AuditFilterBar({
  activeTab,
  actionFilter,
  setActionFilter,
  recordTypeFilter,
  setRecordTypeFilter,
  severityFilter,
  setSeverityFilter,
}: {
  activeTab: 'audit' | 'security';
  actionFilter: string;
  setActionFilter: (v: string) => void;
  recordTypeFilter: string;
  setRecordTypeFilter: (v: string) => void;
  severityFilter: string;
  setSeverityFilter: (v: string) => void;
}) {
  if (activeTab === 'security') {
    return (
      <div className="flex items-center gap-2 text-small">
        <span className="text-text-muted font-medium">Severity:</span>
        <Select
          options={SEVERITY_OPTIONS}
          value={severityFilter}
          onChange={setSeverityFilter}
          className="text-small min-w-[140px]"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 text-small">
      <div className="flex items-center gap-1.5">
        <span className="text-text-muted font-medium">Action:</span>
        <Select
          options={ACTION_OPTIONS}
          value={actionFilter}
          onChange={setActionFilter}
          className="text-small min-w-[130px]"
        />
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-text-muted font-medium">Entity Type:</span>
        <Select
          options={RECORD_TYPE_OPTIONS}
          value={recordTypeFilter}
          onChange={setRecordTypeFilter}
          className="text-small min-w-[140px]"
        />
      </div>
    </div>
  );
}

function toFilterParam(val: string): string | undefined {
  if (val) return val;
  return undefined;
}

function AuditTabsHeader({
  activeTab,
  onSelectTab,
}: {
  activeTab: 'audit' | 'security';
  onSelectTab: (tab: 'audit' | 'security') => void;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-border">
      <button
        type="button"
        onClick={() => onSelectTab('audit')}
        className={`px-4 py-2 text-small font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
          activeTab === 'audit'
            ? 'border-primary text-primary'
            : 'border-transparent text-text-muted hover:text-text'
        }`}
      >
        <ShieldCheck className="w-4 h-4" />
        <span>Audit Trail (Mutations)</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectTab('security')}
        className={`px-4 py-2 text-small font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
          activeTab === 'security'
            ? 'border-primary text-primary'
            : 'border-transparent text-text-muted hover:text-text'
        }`}
      >
        <ShieldAlert className="w-4 h-4" />
        <span>Security & Access Events</span>
      </button>
    </div>
  );
}

export function AuditLogViewerPage() {
  const [activeTab, setActiveTab] = useState<'audit' | 'security'>('audit');
  const [selectedLog, setSelectedLog] = useState<AuditLogRecord | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [recordTypeFilter, setRecordTypeFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');

  // Queries
  const auditLogsQuery = useAuditControllerGetAuditLogs({
    action: toFilterParam(actionFilter),
    recordType: toFilterParam(recordTypeFilter),
    limit: 50,
  });

  const securityEventsQuery = useAuditControllerGetSecurityEvents({
    severity: toFilterParam(severityFilter),
    limit: 50,
  });

  const auditColumns = useMemo(
    () =>
      buildAuditColumns((log) => {
        setSelectedLog(log);
        setIsDetailOpen(true);
      }),
    [],
  );

  const handleExportCsv = () => {
    window.open(getExportEndpoint(activeTab), '_blank');
  };

  const handleRefresh = () => {
    void auditLogsQuery.refetch();
    void securityEventsQuery.refetch();
  };

  const auditData = (auditLogsQuery.data?.items ?? []) as unknown as AuditLogRecord[];
  const securityData = (securityEventsQuery.data?.items ?? []) as unknown as SecurityEventRecord[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-heading-2 text-text font-semibold flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            <span>Audit & Security Event Viewer</span>
          </h1>
          <p className="text-caption text-text-muted mt-0.5">
            Immutable append-only ledger of state mutations, privilege changes, and security events
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleExportCsv}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <AuditTabsHeader activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* Filters Bar */}
      <div className="card-workspace p-3 flex flex-wrap items-center justify-between gap-3">
        <AuditFilterBar
          activeTab={activeTab}
          actionFilter={actionFilter}
          setActionFilter={setActionFilter}
          recordTypeFilter={recordTypeFilter}
          setRecordTypeFilter={setRecordTypeFilter}
          severityFilter={severityFilter}
          setSeverityFilter={setSeverityFilter}
        />
      </div>

      {/* Content */}
      {activeTab === 'audit' ? (
        <AuditTrailPanel
          isLoading={auditLogsQuery.isLoading}
          isError={auditLogsQuery.isError}
          data={auditData}
          columns={auditColumns}
          onRetry={() => void auditLogsQuery.refetch()}
        />
      ) : (
        <SecurityEventsPanel
          isLoading={securityEventsQuery.isLoading}
          isError={securityEventsQuery.isError}
          data={securityData}
          columns={SECURITY_COLUMNS}
          onRetry={() => void securityEventsQuery.refetch()}
        />
      )}

      {/* Audit Detail Drawer */}
      <AuditDetailDrawer
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        log={selectedLog}
      />
    </div>
  );
}
