import { useState, useMemo } from 'react';
import type { SelectOption } from '@exzaestate/ui';
import {
  useAuditControllerGetAuditLogs,
  useAuditControllerGetSecurityEvents,
} from '@exzaestate/api-client';
import type { AuditLogRecord, SecurityEventRecord } from '../types.js';
import { AuditDetailDrawer } from '../components/AuditDetailDrawer.js';
import { buildAuditColumns, SECURITY_COLUMNS } from './audit-columns.js';
import { AuditTrailPanel, SecurityEventsPanel } from './AuditTabPanels.js';
import {
  AuditPageHeader,
  AuditTabSwitcher,
  AuditKpiCards,
  AuditToolbar,
  matchesAuditSearch,
  matchesSecuritySearch,
} from './AuditViewerComponents.js';

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

function toFilterParam(val: string): string | undefined {
  if (val) return val;
  return undefined;
}

export function AuditLogViewerPage() {
  const [activeTab, setActiveTab] = useState<'audit' | 'security'>('audit');
  const [selectedLog, setSelectedLog] = useState<AuditLogRecord | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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

  const rawAuditData = (auditLogsQuery.data?.items ?? []) as unknown as AuditLogRecord[];
  const rawSecurityData = (securityEventsQuery.data?.items ??
    []) as unknown as SecurityEventRecord[];

  const filteredAuditData = useMemo(() => {
    if (!searchTerm.trim()) return rawAuditData;
    const term = searchTerm.toLowerCase();
    return rawAuditData.filter((r) => matchesAuditSearch(r, term));
  }, [rawAuditData, searchTerm]);

  const filteredSecurityData = useMemo(() => {
    if (!searchTerm.trim()) return rawSecurityData;
    const term = searchTerm.toLowerCase();
    return rawSecurityData.filter((s) => matchesSecuritySearch(s, term));
  }, [rawSecurityData, searchTerm]);

  const kpis = useMemo(() => {
    const totalMutations = rawAuditData.length;
    const totalSecurity = rawSecurityData.length;
    const criticalCount = rawSecurityData.filter(
      (s) => s.severity?.toUpperCase() === 'CRITICAL' || s.severity?.toUpperCase() === 'ERROR',
    ).length;
    return { totalMutations, totalSecurity, criticalCount };
  }, [rawAuditData, rawSecurityData]);

  const hasActiveFilters = Boolean(
    searchTerm || actionFilter || recordTypeFilter || severityFilter,
  );

  const handleClearFilters = () => {
    setSearchTerm('');
    setActionFilter('');
    setRecordTypeFilter('');
    setSeverityFilter('');
  };

  const toolbarNode = (
    <AuditToolbar
      activeTab={activeTab}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      actionFilter={actionFilter}
      onActionChange={setActionFilter}
      recordTypeFilter={recordTypeFilter}
      onRecordTypeChange={setRecordTypeFilter}
      severityFilter={severityFilter}
      onSeverityChange={setSeverityFilter}
      hasActiveFilters={hasActiveFilters}
      onReset={handleClearFilters}
      actionOptions={ACTION_OPTIONS}
      recordTypeOptions={RECORD_TYPE_OPTIONS}
      severityOptions={SEVERITY_OPTIONS}
    />
  );

  return (
    <div className="container-page space-y-6">
      <AuditPageHeader
        onRefresh={() => {
          void auditLogsQuery.refetch();
          void securityEventsQuery.refetch();
        }}
        onExportCsv={() => window.open(getExportEndpoint(activeTab), '_blank')}
      />

      <AuditKpiCards stats={kpis} />

      <div className="space-y-4">
        <AuditTabSwitcher activeTab={activeTab} onSelectTab={setActiveTab} />

        {activeTab === 'audit' ? (
          <AuditTrailPanel
            isLoading={auditLogsQuery.isLoading}
            isError={auditLogsQuery.isError}
            data={filteredAuditData}
            columns={auditColumns}
            onRetry={() => void auditLogsQuery.refetch()}
            toolbar={toolbarNode}
          />
        ) : (
          <SecurityEventsPanel
            isLoading={securityEventsQuery.isLoading}
            isError={securityEventsQuery.isError}
            data={filteredSecurityData}
            columns={SECURITY_COLUMNS}
            onRetry={() => void securityEventsQuery.refetch()}
            toolbar={toolbarNode}
          />
        )}
      </div>

      <AuditDetailDrawer
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        log={selectedLog}
      />
    </div>
  );
}
