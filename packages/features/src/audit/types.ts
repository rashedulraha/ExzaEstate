export interface AuditLogRecord {
  id: string;
  companyId: string;
  actorId: string | null;
  module: string;
  recordType: string;
  recordId: string;
  action: string;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  reason: string | null;
  ipAddress: string | null;
  requestId: string;
  createdAt: string;
}

export interface SecurityEventRecord {
  id: string;
  companyId: string;
  userId: string | null;
  eventType: string;
  severity: string;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  createdAt: string;
}
