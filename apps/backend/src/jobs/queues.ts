export const QUEUE_NAMES = {
  NOTIFICATIONS: 'notifications',
  OVERDUE_CALCULATION: 'overdue-calculation',
  REPORT_EXPORT: 'report-export',
  APPROVAL_EXPIRY: 'approval-expiry',
  DOCUMENT_SCAN: 'document-scan',
  OUTBOX_MAINTENANCE: 'outbox-maintenance',
  TENANT_IMPORT: 'tenant-import',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
