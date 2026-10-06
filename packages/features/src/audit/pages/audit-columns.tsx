import { Button, type ColumnDef } from '@exzaestate/ui';
import { Eye } from 'lucide-react';
import type { AuditLogRecord, SecurityEventRecord } from '../types.js';

function getActionBadgeStyle(action: string | undefined): string {
  const lower = action?.toLowerCase() ?? '';
  if (lower.includes('delete') || lower.includes('cancel')) {
    return 'bg-danger/12 text-danger';
  }
  if (lower.includes('create') || lower.includes('post')) {
    return 'bg-success/12 text-success';
  }
  return 'bg-primary/10 text-primary';
}

function getSeverityBadgeStyle(sev: string | undefined): string {
  const upper = sev?.toUpperCase() ?? '';
  if (upper === 'CRITICAL' || upper === 'ERROR') {
    return 'bg-danger/15 text-danger border-danger/30';
  }
  if (upper === 'WARN') {
    return 'bg-warning/15 text-warning border-warning/30';
  }
  return 'bg-info/15 text-info border-info/30';
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
          {r.createdAt ? r.createdAt.replace('T', ' ').slice(0, 19) : '-'}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (r: AuditLogRecord) => (
        <span
          className={`px-2 py-0.5 rounded text-caption font-semibold uppercase tracking-wider ${getActionBadgeStyle(
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
        <div>
          <span className="font-medium text-text uppercase text-caption">{r.recordType}</span>
          <span className="font-mono text-caption text-text-muted block truncate max-w-[140px]">
            {r.recordId}
          </span>
        </div>
      ),
    },
    {
      key: 'actorId',
      header: 'Actor',
      render: (r: AuditLogRecord) => (
        <span className="font-mono text-caption text-text">
          {r.actorId ? r.actorId.slice(0, 8) + '...' : 'System'}
        </span>
      ),
    },
    {
      key: 'ipAddress',
      header: 'IP Address',
      render: (r: AuditLogRecord) => (
        <span className="font-mono text-caption text-text-muted">{r.ipAddress ?? '-'}</span>
      ),
    },
    {
      key: 'reason',
      header: 'Reason / Note',
      render: (r: AuditLogRecord) => (
        <span className="text-small text-text-muted truncate max-w-[180px] block">
          {r.reason ?? '-'}
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
        {r.createdAt ? r.createdAt.replace('T', ' ').slice(0, 19) : '-'}
      </span>
    ),
  },
  {
    key: 'severity',
    header: 'Severity',
    render: (r: SecurityEventRecord) => (
      <span
        className={`px-2 py-0.5 rounded-full text-caption font-bold border ${getSeverityBadgeStyle(
          r.severity,
        )}`}
      >
        {r.severity}
      </span>
    ),
  },
  {
    key: 'eventType',
    header: 'Event Type',
    render: (r: SecurityEventRecord) => (
      <span className="font-mono font-medium text-small text-text">{r.eventType}</span>
    ),
  },
  {
    key: 'userId',
    header: 'User Context',
    render: (r: SecurityEventRecord) => (
      <span className="font-mono text-caption text-text-muted">
        {r.userId ? r.userId.slice(0, 8) + '...' : 'Anonymous / Auth'}
      </span>
    ),
  },
  {
    key: 'ipAddress',
    header: 'Client IP',
    render: (r: SecurityEventRecord) => (
      <span className="font-mono text-caption text-text-muted">{r.ipAddress ?? '-'}</span>
    ),
  },
];
