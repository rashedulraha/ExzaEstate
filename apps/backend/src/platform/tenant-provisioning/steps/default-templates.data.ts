/**
 * default-templates.data.ts — Standard built-in notification templates per event
 */

export interface DefaultTemplateDefinition {
  eventCode: string;
  channel: 'IN_APP' | 'EMAIL' | 'SMS';
  title: string;
  body: string;
}

export const DEFAULT_NOTIFICATION_TEMPLATES: readonly DefaultTemplateDefinition[] = [
  {
    eventCode: 'booking.requested',
    channel: 'IN_APP',
    title: 'New Booking Request: {{bookingNo}}',
    body: 'A new booking {{bookingNo}} has been submitted for unit {{propertyCode}}.',
  },
  {
    eventCode: 'booking.confirmed',
    channel: 'IN_APP',
    title: 'Booking Confirmed: {{bookingNo}}',
    body: 'Booking {{bookingNo}} for unit {{propertyCode}} has been officially confirmed.',
  },
  {
    eventCode: 'booking.cancelled',
    channel: 'IN_APP',
    title: 'Booking Cancelled: {{bookingNo}}',
    body: 'Booking {{bookingNo}} for unit {{propertyCode}} has been cancelled.',
  },
  {
    eventCode: 'installment.due',
    channel: 'IN_APP',
    title: 'Installment Due: {{installmentNo}}',
    body: 'Installment #{{installmentNo}} of {{amount}} is due on {{dueDate}}.',
  },
  {
    eventCode: 'installment.overdue',
    channel: 'IN_APP',
    title: 'Installment Overdue Alert',
    body: 'Installment #{{installmentNo}} of {{amount}} is overdue since {{dueDate}}.',
  },
  {
    eventCode: 'payment.received',
    channel: 'IN_APP',
    title: 'Payment Received: {{receiptNo}}',
    body: 'Payment receipt {{receiptNo}} of {{amount}} has been recorded.',
  },
  {
    eventCode: 'payment.posted',
    channel: 'IN_APP',
    title: 'Payment Posted: {{receiptNo}}',
    body: 'Payment receipt {{receiptNo}} of {{amount}} has been posted to general ledger.',
  },
  {
    eventCode: 'payment.bounced',
    channel: 'IN_APP',
    title: 'Cheque Bounced Alert: {{chequeNo}}',
    body: 'Payment cheque {{chequeNo}} for {{amount}} has bounced.',
  },
  {
    eventCode: 'approval.requested',
    channel: 'IN_APP',
    title: 'Approval Required: {{action}}',
    body: 'Approval is requested for {{entityType}} {{entityId}} by {{requesterName}}.',
  },
  {
    eventCode: 'approval.granted',
    channel: 'IN_APP',
    title: 'Approval Granted: {{action}}',
    body: 'Your approval request for {{entityType}} {{entityId}} was granted by {{approverName}}.',
  },
  {
    eventCode: 'approval.rejected',
    channel: 'IN_APP',
    title: 'Approval Rejected: {{action}}',
    body: 'Your approval request for {{entityType}} {{entityId}} was rejected: {{reason}}.',
  },
  {
    eventCode: 'document.expiry_alert',
    channel: 'IN_APP',
    title: 'Document Expiring Soon: {{documentName}}',
    body: 'Document {{documentName}} ({{category}}) is expiring on {{expiryDate}}.',
  },
  {
    eventCode: 'lead.created',
    channel: 'IN_APP',
    title: 'New Lead Assigned: {{leadName}}',
    body: 'New sales lead {{leadName}} has been assigned to you.',
  },
  {
    eventCode: 'security.event',
    channel: 'IN_APP',
    title: 'Security Alert: {{eventType}}',
    body: 'Security anomaly detected: {{eventType}} with severity {{severity}}.',
  },
  {
    eventCode: 'followup.overdue',
    channel: 'IN_APP',
    title: 'Follow-Up Overdue: {{leadName}}',
    body: 'Follow-up interaction ({{followUpType}}) for {{leadName}} was due on {{dueDate}} and is now overdue.',
  },
  {
    eventCode: 'followup.reminder',
    channel: 'IN_APP',
    title: 'Follow-Up Reminder: {{leadName}}',
    body: 'Follow-up interaction ({{followUpType}}) for {{leadName}} is scheduled on {{dueDate}}.',
  },
] as const;
