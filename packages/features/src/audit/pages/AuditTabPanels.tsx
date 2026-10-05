import { DataTable, LoadingState, ErrorState, type ColumnDef } from '@exzaestate/ui';
import type { AuditLogRecord, SecurityEventRecord } from '../types.js';

interface AuditTrailPanelProps {
  isLoading: boolean;
  isError: boolean;
  data: AuditLogRecord[];
  columns: ColumnDef<AuditLogRecord>[];
  onRetry: () => void;
}

export function AuditTrailPanel({
  isLoading,
  isError,
  data,
  columns,
  onRetry,
}: AuditTrailPanelProps) {
  if (isLoading && data.length === 0) {
    return <LoadingState />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to load audit logs"
        message="Could not load audit log records from server."
        onRetry={onRetry}
      />
    );
  }

  return (
    <div className="card-workspace overflow-hidden">
      <DataTable data={data} columns={columns} keyExtractor={(r) => r.id} />
    </div>
  );
}

interface SecurityEventsPanelProps {
  isLoading: boolean;
  isError: boolean;
  data: SecurityEventRecord[];
  columns: ColumnDef<SecurityEventRecord>[];
  onRetry: () => void;
}

export function SecurityEventsPanel({
  isLoading,
  isError,
  data,
  columns,
  onRetry,
}: SecurityEventsPanelProps) {
  if (isLoading && data.length === 0) {
    return <LoadingState />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to load security events"
        message="Could not load security events from server."
        onRetry={onRetry}
      />
    );
  }

  return (
    <div className="card-workspace overflow-hidden">
      <DataTable data={data} columns={columns} keyExtractor={(r) => r.id} />
    </div>
  );
}
