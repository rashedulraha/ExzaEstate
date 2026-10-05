import { Drawer, Button, LoadingState, ErrorState } from '@exzaestate/ui';
import { Clock, User } from 'lucide-react';
import { useAuditControllerGetEntityHistory } from '@exzaestate/api-client';
import type { AuditLogRecord } from '../types.js';

export interface EntityHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  recordType: string;
  recordId: string;
}

function EntityHistoryContent({
  isLoading,
  isError,
  historyItems,
  onRetry,
  onClose,
}: {
  isLoading: boolean;
  isError: boolean;
  historyItems: AuditLogRecord[];
  onRetry: () => void;
  onClose: () => void;
}) {
  if (isLoading) {
    return <LoadingState />;
  }
  if (isError) {
    return (
      <ErrorState
        title="Failed to load history"
        message="Could not retrieve chronological audit trail."
        onRetry={onRetry}
      />
    );
  }
  if (historyItems.length === 0) {
    return (
      <div className="py-12 text-center text-text-muted text-small">
        No audit history records recorded for this entity.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
        {historyItems.map((item) => (
          <div key={item.id} className="relative group">
            {/* Marker */}
            <div className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full bg-primary border-2 border-surface" />

            <div className="card-workspace p-4 space-y-2">
              <div className="flex items-center justify-between text-caption">
                <span className="font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-surface-sunken text-primary">
                  {item.action}
                </span>
                <span className="flex items-center gap-1 text-text-muted font-mono">
                  <Clock className="w-3 h-3" />
                  {item.createdAt}
                </span>
              </div>

              <div className="text-small text-text flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-text-muted" />
                <span>
                  Actor:{' '}
                  <strong className="font-mono text-caption">{item.actorId ?? 'System'}</strong>
                </span>
              </div>

              {item.reason && (
                <p className="text-caption text-text-muted italic border-l-2 border-accent pl-2">
                  {item.reason}
                </p>
              )}

              {/* Summary of changes */}
              {item.newValue && (
                <div className="mt-2 pt-2 border-t border-border/60">
                  <span className="text-[11px] font-semibold text-text-muted block mb-1">
                    Mutated Properties:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.keys(item.newValue).map((key) => (
                      <span
                        key={key}
                        className="px-1.5 py-0.5 rounded bg-surface-sunken text-caption font-mono text-text"
                      >
                        {key}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-border flex justify-end">
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}

export function EntityHistoryDrawer({
  isOpen,
  onClose,
  recordType,
  recordId,
}: EntityHistoryDrawerProps) {
  const query = useAuditControllerGetEntityHistory(recordType, recordId, {
    query: {
      enabled: isOpen && Boolean(recordType && recordId),
    },
  });

  const historyData = query.data as unknown as
    | { recordType: string; recordId: string; history: AuditLogRecord[] }
    | undefined;

  const historyItems = historyData?.history ?? [];

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Entity Mutation History"
      subtitle={`Chronological audit trail for ${recordType} (${recordId})`}
      size="lg"
    >
      <EntityHistoryContent
        isLoading={query.isLoading}
        isError={query.isError}
        historyItems={historyItems}
        onRetry={() => void query.refetch()}
        onClose={onClose}
      />
    </Drawer>
  );
}
