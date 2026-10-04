/**
 * events.ts — Domain Events Catalog
 * Defined in architecture.md §8.1, §10, and accounting-rules.md
 */

export const DOMAIN_EVENTS = {
  // Booking events
  BOOKING_REQUESTED: 'booking.requested',
  BOOKING_CONFIRMED: 'booking.confirmed',
  BOOKING_CANCELLED: 'booking.cancelled',
  BOOKING_TRANSFERRED: 'booking.transferred',
  BOOKING_AGREEMENT_GENERATED: 'booking.agreement_generated',
  BOOKING_AGREEMENT_SIGNED: 'booking.agreement_signed',
  BOOKING_COMPLETED: 'booking.completed',

  // Property events
  PROPERTY_STATUS_CHANGED: 'property.status_changed',
  PROPERTY_HOLD_EXPIRED: 'property.hold_expired',

  // Collection & Payments
  PAYMENT_RECEIVED: 'payment.received',
  PAYMENT_POSTED: 'payment.posted',
  PAYMENT_REVERSED: 'payment.reversed',
  PAYMENT_BOUNCED: 'payment.bounced',
  PAYMENT_CANCELLED: 'payment.cancelled',

  // Refunds
  REFUND_REQUESTED: 'refund.requested',
  REFUND_APPROVED: 'refund.approved',
  REFUND_PAID: 'refund.paid',
  REFUND_REJECTED: 'refund.rejected',

  // Installments
  INSTALLMENT_DUE: 'installment.due',
  INSTALLMENT_OVERDUE: 'installment.overdue',

  // Approvals
  APPROVAL_REQUESTED: 'approval.requested',
  APPROVAL_GRANTED: 'approval.granted',
  APPROVAL_REJECTED: 'approval.rejected',
  APPROVAL_EXPIRED: 'approval.expired',
  APPROVAL_OVERRIDDEN: 'approval.overridden',

  // Accounting
  JOURNAL_POSTED: 'journal.posted',
  JOURNAL_REVERSED: 'journal.reversed',
  PERIOD_CLOSED: 'period.closed',
  PERIOD_REOPENED: 'period.reopened',
  PERIOD_LOCKED: 'period.locked',

  // Operations
  VENDOR_BILL_POSTED: 'vendor_bill.posted',
  VENDOR_PAYMENT_POSTED: 'vendor_payment.posted',
  COMMISSION_EARNED: 'commission.earned',
  COMMISSION_APPROVED: 'commission.approved',
  COMMISSION_PAID: 'commission.paid',

  // CRM & Follow-ups
  LEAD_CREATED: 'lead.created',
  LEAD_CONTACTED: 'lead.contacted',
  LEAD_QUALIFIED: 'lead.qualified',
  LEAD_CONVERTED: 'lead.converted',
  FOLLOW_UP_CREATED: 'followup.created',
  FOLLOW_UP_COMPLETED: 'followup.completed',
  FOLLOW_UP_OVERDUE: 'followup.overdue',
  CUSTOMER_CREATED: 'customer.created',
  CUSTOMER_UPDATED: 'customer.updated',
  CUSTOMER_DELETED: 'customer.deleted',
  CUSTOMER_KYC_VERIFIED: 'customer.kyc_verified',
  CUSTOMER_PII_VIEWED: 'customer.pii_viewed',

  // Authentication & Security
  AUTH_REFRESH_TOKEN_REUSE: 'auth.refresh_token_reuse',
  AUTH_PASSWORD_RESET_REQUESTED: 'auth.password_reset_requested',
  AUTH_ACCOUNT_LOCKED: 'auth.account_locked',
  SECURITY_EVENT: 'security.event',
} as const;

export type DomainEvent = (typeof DOMAIN_EVENTS)[keyof typeof DOMAIN_EVENTS];
