import { useState, useMemo } from 'react';
import { Search, ShieldAlert } from 'lucide-react';
import type { PlatformAuditLogItem } from '../schemas/system-admin.schema.js';

interface PlatformAuditLogsTableProps {
  logs: PlatformAuditLogItem[];
  isLoading?: boolean;
}

export function PlatformAuditLogsTable({ logs, isLoading }: PlatformAuditLogsTableProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter(
      (l) =>
        l.action.toLowerCase().includes(q) ||
        l.companyName.toLowerCase().includes(q) ||
        l.companyCode.toLowerCase().includes(q) ||
        (l.reason && l.reason.toLowerCase().includes(q)),
    );
  }, [logs, search]);

  return (
    <div className="rounded-card border border-border bg-surface shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search audit trail by action, reason, company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-button border border-border-input bg-surface pl-9 pr-4 py-1.5 text-body text-text placeholder:text-text-disabled transition focus:border-focus focus:outline-none focus:ring-1 focus:ring-focus"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto text-caption text-text-muted">
          <span>Immutable Platform Log</span>
          <span className="font-mono tabular-nums px-2 py-0.5 rounded-button bg-surface-sunken border border-border">
            {logs.length} events
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface-sunken/40 text-caption font-semibold text-text-muted">
              <th className="py-3 px-4">Event Timestamp</th>
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">Company Scope</th>
              <th className="py-3 px-4">Entity Type</th>
              <th className="py-3 px-4">Audit Justification & Marker</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-body">
            <AuditLogsTableBody isLoading={isLoading} logsCount={logs.length} filtered={filtered} />
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AuditLogsTableBody({
  isLoading,
  logsCount,
  filtered,
}: {
  isLoading?: boolean;
  logsCount: number;
  filtered: PlatformAuditLogItem[];
}) {
  if (isLoading && logsCount === 0) {
    return (
      <tr>
        <td colSpan={5} className="py-10 text-center text-text-muted">
          <div className="h-4 w-32 mx-auto animate-skeleton-breathe rounded bg-surface-sunken" />
        </td>
      </tr>
    );
  }

  if (filtered.length === 0) {
    return (
      <tr>
        <td colSpan={5} className="py-12 text-center text-text-muted">
          <div className="flex flex-col items-center justify-center gap-2">
            <ShieldAlert className="w-8 h-8 text-text-disabled" />
            <p className="text-body font-medium text-text">No audit logs found</p>
            <p className="text-caption text-text-muted">
              Platform events will appear here automatically.
            </p>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <>
      {filtered.map((log) => {
        const dateStr = new Date(log.createdAt).toLocaleString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });

        return (
          <tr key={log.id} className="hover:bg-surface-sunken/20 transition-colors">
            <td className="py-3 px-4 font-mono text-small text-text tabular-nums whitespace-nowrap">
              {dateStr}
            </td>
            <td className="py-3 px-4 whitespace-nowrap">
              <span className="font-mono text-caption px-2 py-0.5 rounded-button bg-surface-sunken border border-border font-semibold text-text">
                {log.action}
              </span>
            </td>
            <td className="py-3 px-4">
              <div className="font-semibold text-text text-small">{log.companyName}</div>
              <div className="text-caption text-text-muted font-mono">{log.companyCode}</div>
            </td>
            <td className="py-3 px-4 text-small text-text-muted">{log.recordType || 'Platform'}</td>
            <td className="py-3 px-4 font-mono text-caption text-text-muted">
              <span className="text-text font-medium">{log.reason || '—'}</span>
            </td>
          </tr>
        );
      })}
    </>
  );
}
