import { Drawer, Button } from '@exzaestate/ui';
import { User, Globe, Hash, Clock, FileCode, CheckCircle2, MinusCircle } from 'lucide-react';
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
        <div className="rounded-card border border-border p-4 space-y-3 bg-surface-sunken/60">
          <div className="grid grid-cols-2 gap-3 text-small">
            <div>
              <span className="text-caption text-text-muted flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" /> Timestamp (UTC)
              </span>
              <span className="font-mono tabular-nums font-medium text-text mt-0.5 block">
                {log.createdAt}
              </span>
            </div>

            <div>
              <span className="text-caption text-text-muted flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-text-muted" /> Actor ID
              </span>
              <span className="font-mono text-caption text-text mt-0.5 block truncate">
                {log.actorId ?? 'SYSTEM / AUTOMATION'}
              </span>
            </div>

            <div>
              <span className="text-caption text-text-muted flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-text-muted" /> Client IP
              </span>
              <span className="font-mono text-caption text-text mt-0.5 block">
                {log.ipAddress ?? 'Internal / Sidecar'}
              </span>
            </div>

            <div>
              <span className="text-caption text-text-muted flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-text-muted" /> Request ID
              </span>
              <span className="font-mono text-caption text-text-muted mt-0.5 block truncate">
                {log.requestId}
              </span>
            </div>
          </div>

          {log.reason && (
            <div className="pt-2 border-t border-border">
              <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
                Mutation Reason:
              </span>
              <p className="text-small text-text mt-0.5 italic">{log.reason}</p>
            </div>
          )}
        </div>

        {/* Changes Diff: Before vs After */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-small font-semibold text-text">
            <FileCode className="w-4 h-4 text-primary" />
            <span>State Changes Diff</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Old Value */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wider text-danger">
                <MinusCircle className="w-3.5 h-3.5" />
                <span>Previous State (Before)</span>
              </div>
              <pre className="p-3 rounded-card bg-surface-sunken border border-danger/20 text-caption font-mono overflow-x-auto max-h-80 text-text">
                {log.oldValue ? JSON.stringify(log.oldValue, null, 2) : '(none - created)'}
              </pre>
            </div>

            {/* New Value */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wider text-success">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Resulting State (After)</span>
              </div>
              <pre className="p-3 rounded-card bg-surface-sunken border border-success/20 text-caption font-mono overflow-x-auto max-h-80 text-text">
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
