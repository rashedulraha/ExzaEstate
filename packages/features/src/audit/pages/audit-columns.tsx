import { Button, type ColumnDef } from '@exzaestate/ui';
import { Eye, ShieldAlert, AlertTriangle, Info, ShieldX } from 'lucide-react';
import type { AuditLogRecord, SecurityEventRecord } from '../types.js';

function getActionBadgeStyle(action: string | undefined): string {
  const lower = action?.toLowerCase() ?? '';
  if (lower.includes('delete') || lower.includes('cancel')) {
    return 'bg-danger/12 text-danger border-danger/30';
  }
  if (lower.includes('create') || lower.includes('post')) {
    return 'bg-success/12 text-success border-success/30';
  }
  return 'bg-primary/10 text-primary border-primary/25';
}

function getSeverityBadge(sev: string | undefined) {
  const upper = sev?.toUpperCase() ?? 'INFO';
  if (upper === 'CRITICAL') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-caption font-bold bg-danger/15 text-danger border border-danger/30">
        <ShieldX className="w-3 h-3" />
        CRITICAL
      </span>
    );
  }
  if (upper === 'ERROR') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-caption font-semibold bg-danger/12 text-danger border border-danger/25">
        <ShieldAlert className="w-3 h-3" />
        ERROR
      </span>
    );
  }
  if (upper === 'WARN') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-caption font-semibold bg-warning/12 text-warning border border-warning/25">
        <AlertTriangle className="w-3 h-3" />
        WARN
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-caption font-medium bg-info/12 text-info border border-info/25">
      <Info className="w-3 h-3" />
      INFO
    </span>
  );
}

export function buildAuditColumns(
  onSelectLog: (log: AuditLogRecord) => void,
): ColumnDef<AuditLogRecord>[] {
  return [
    {
      key: 'createdAt',
      header: 'Timestamp (UTC)',
      render: (r: AuditLogRecord) => (
        <span className="font-mono text-caption text-text-muted">
          {r.createdAt ? r.createdAt.replace('T', ' ').slice(0, 19) : '—'}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (r: AuditLogRecord) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-caption font-semibold uppercase tracking-wider border ${getActionBadgeStyle(
            r.action,
          )}`}
        >
          {r.action}
        </span>
      ),
    },
    {
      key: 'recordType',
      header: 'Entity',
      render: (r: AuditLogRecord) => (
        <div className="flex flex-col min-w-0">
          <span className="font-semibold text-text uppercase text-caption tracking-wider">
            {r.recordType}
          </span>
          <span className="font-mono text-caption text-primary truncate max-w-40">
            {r.recordId}
          </span>
        </div>
      ),
    },
    {
      key: 'actorId',
      header: 'Actor',
      render: (r: AuditLogRecord) => (
        <span className="font-mono text-caption text-text bg-surface-sunken px-2 py-0.5 rounded border border-border">
          {r.actorId ? r.actorId.slice(0, 12) : 'System / Auto'}
        </span>
      ),
    },
    {
      key: 'ipAddress',
      header: 'IP Address',
      render: (r: AuditLogRecord) => (
        <span className="font-mono text-caption text-text-muted">{r.ipAddress ?? '—'}</span>
      ),
    },
    {
      key: 'reason',
      header: 'Reason / Note',
      render: (r: AuditLogRecord) => (
        <span className="text-small text-text-muted truncate max-w-xs block">
          {r.reason ?? '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r: AuditLogRecord) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSelectLog(r)}
          leftIcon={<Eye className="w-3.5 h-3.5" />}
        >
          Diff
        </Button>
      ),
    },
  ];
}

export const SECURITY_COLUMNS: ColumnDef<SecurityEventRecord>[] = [
  {
    key: 'createdAt',
    header: 'Timestamp',
    render: (r: SecurityEventRecord) => (
      <span className="font-mono text-caption text-text-muted">
        {r.createdAt ? r.createdAt.replace('T', ' ').slice(0, 19) : '—'}
      </span>
    ),
  },
  {
    key: 'severity',
    header: 'Severity',
    align: 'center',
    render: (r: SecurityEventRecord) => getSeverityBadge(r.severity),
  },
  {
    key: 'eventType',
    header: 'Event Type',
    render: (r: SecurityEventRecord) => (
      <span className="font-mono font-semibold text-small text-text">{r.eventType}</span>
    ),
  },
  {
    key: 'userId',
    header: 'User Context',
    render: (r: SecurityEventRecord) => (
      <span className="font-mono text-caption text-text-muted">
        {r.userId ? r.userId.slice(0, 12) : 'Anonymous / Auth'}
      </span>
    ),
  },
  {
    key: 'ipAddress',
    header: 'Client IP',
    render: (r: SecurityEventRecord) => (
      <span className="font-mono text-caption text-text-muted">{r.ipAddress ?? '—'}</span>
    ),
  },
];
