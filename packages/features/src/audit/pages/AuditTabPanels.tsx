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
    <div className="space-y-4">
      {toolbar}
      <div className="rounded-card border border-border bg-surface shadow-xs">
        <DataTable
          data={data}
          columns={columns}
          keyExtractor={(r) => r.id}
          className="border-none shadow-none"
          emptyState={
            <EmptyState
              icon={<ShieldCheck className="w-6 h-6 text-text-muted" />}
              title="No Audit Records Found"
              description="No state mutations match your selected filters or action criteria."
              dashedBorder
            />
          }
        />
      </div>
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
    <div className="space-y-4">
      {toolbar}
      <div className="rounded-card border border-border bg-surface shadow-xs">
        <DataTable
          data={data}
          columns={columns}
          keyExtractor={(r) => r.id}
          className="border-none shadow-none"
          emptyState={
            <EmptyState
              icon={<ShieldAlert className="w-6 h-6 text-text-muted" />}
              title="No Security Events Found"
              description="No authentication or authorization security events recorded for the current scope."
              dashedBorder
            />
          }
        />
      </div>
    </div>
  );
}
