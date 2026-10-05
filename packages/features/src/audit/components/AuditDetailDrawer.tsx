import { Drawer, Button } from '@exzaestate/ui';
import { User, Globe, Hash, Clock, FileCode } from 'lucide-react';
import type { AuditLogRecord } from '../types.js';

export interface AuditDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  log: AuditLogRecord | null;
}

export function AuditDetailDrawer({ isOpen, onClose, log }: AuditDetailDrawerProps) {
  if (!log) return null;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Audit Record Details"
      subtitle={`Mutation on ${log.recordType} (${log.recordId})`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Metadata Summary Card */}
        <div className="card-workspace p-4 space-y-3 bg-surface-sunken/40">
          <div className="grid grid-cols-2 gap-3 text-small">
            <div>
              <span className="text-caption text-text-muted flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Timestamp (UTC)
              </span>
              <span className="font-mono tabular-nums font-medium text-text mt-0.5 block">
                {log.createdAt}
              </span>
            </div>

            <div>
              <span className="text-caption text-text-muted flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> Actor ID
              </span>
              <span className="font-mono text-caption text-text mt-0.5 block truncate">
                {log.actorId ?? 'SYSTEM / AUTOMATION'}
              </span>
            </div>

            <div>
              <span className="text-caption text-text-muted flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" /> Client IP
              </span>
              <span className="font-mono text-caption text-text mt-0.5 block">
                {log.ipAddress ?? 'Internal / Sidecar'}
              </span>
            </div>

            <div>
              <span className="text-caption text-text-muted flex items-center gap-1">
                <Hash className="w-3.5 h-3.5" /> Request ID
              </span>
              <span className="font-mono text-[11px] text-text-muted mt-0.5 block truncate">
                {log.requestId}
              </span>
            </div>
          </div>

          {log.reason && (
            <div className="pt-2 border-t border-border">
              <span className="text-caption text-text-muted">Mutation Reason:</span>
              <p className="text-small text-text mt-0.5 italic">{log.reason}</p>
            </div>
          )}
        </div>

        {/* Changes Diff: Before vs After */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-small font-semibold text-text">
            <FileCode className="w-4 h-4 text-text-muted" />
            <span>State Changes Diff</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Old Value */}
            <div className="space-y-1.5">
              <span className="text-caption font-semibold uppercase text-danger">
                Previous State (Before)
              </span>
              <pre className="p-3 rounded bg-surface-sunken border border-border text-[11px] font-mono overflow-x-auto max-h-80 text-text">
                {log.oldValue ? JSON.stringify(log.oldValue, null, 2) : '(none - created)'}
              </pre>
            </div>

            {/* New Value */}
            <div className="space-y-1.5">
              <span className="text-caption font-semibold uppercase text-success">
                Resulting State (After)
              </span>
              <pre className="p-3 rounded bg-surface-sunken border border-border text-[11px] font-mono overflow-x-auto max-h-80 text-text">
                {log.newValue ? JSON.stringify(log.newValue, null, 2) : '(none - deleted)'}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-border flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
