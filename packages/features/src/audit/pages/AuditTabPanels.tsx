import { DataTable, LoadingState, ErrorState, EmptyState, type ColumnDef } from '@exzaestate/ui';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import type { AuditLogRecord, SecurityEventRecord } from '../types.js';

interface AuditTrailPanelProps {
  isLoading: boolean;
  isError: boolean;
  data: AuditLogRecord[];
  columns: ColumnDef<AuditLogRecord>[];
  onRetry: () => void;
  toolbar?: React.ReactNode;
}

export function AuditTrailPanel({
  isLoading,
  isError,
  data,
  columns,
  onRetry,
  toolbar,
}: AuditTrailPanelProps) {
  if (isLoading && data.length === 0) {
    return <LoadingState variant="table" />;
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
    <div className="rounded-card border border-border bg-surface shadow-xs">
      {toolbar}
      {data.length === 0 ? (
        <div className="p-6">
          <EmptyState
            icon={<ShieldCheck className="w-8 h-8 text-text-muted" />}
            title="No Audit Records Found"
            description="No state mutations match your selected filters or action criteria."
            dashedBorder
          />
        </div>
      ) : (
        <DataTable
          data={data}
          columns={columns}
          keyExtractor={(r) => r.id}
          embedded
          className="border-none shadow-none rounded-b-card"
        />
      )}
    </div>
  );
}

interface SecurityEventsPanelProps {
  isLoading: boolean;
  isError: boolean;
  data: SecurityEventRecord[];
  columns: ColumnDef<SecurityEventRecord>[];
  onRetry: () => void;
  toolbar?: React.ReactNode;
}

export function SecurityEventsPanel({
  isLoading,
  isError,
  data,
  columns,
  onRetry,
  toolbar,
}: SecurityEventsPanelProps) {
  if (isLoading && data.length === 0) {
    return <LoadingState variant="table" />;
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
    <div className="rounded-card border border-border bg-surface shadow-xs">
      {toolbar}
      {data.length === 0 ? (
        <div className="p-6">
          <EmptyState
            icon={<ShieldAlert className="w-8 h-8 text-text-muted" />}
            title="No Security Events Found"
            description="No authentication or authorization security events recorded for the current scope."
            dashedBorder
          />
        </div>
      ) : (
        <DataTable
          data={data}
          columns={columns}
          keyExtractor={(r) => r.id}
          embedded
          className="border-none shadow-none rounded-b-card"
        />
      )}
    </div>
  );
}
