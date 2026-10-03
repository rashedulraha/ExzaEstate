/**
 * statuses.ts — Domain Status Machines & Lifecycles
 * Single source of truth defined in prd.md §9 and design.md §2.5
 */

export const BOOKING_STATUSES = {
  REQUESTED: 'REQUESTED',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  CONFIRMED: 'CONFIRMED',
  AGREEMENT_PENDING: 'AGREEMENT_PENDING',
  AGREEMENT_COMPLETED: 'AGREEMENT_COMPLETED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  TRANSFERRED: 'TRANSFERRED',
} as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[keyof typeof BOOKING_STATUSES];

/**
 * The six active statuses of prd.md §9.1 covered by the database partial unique index.
 */
export const ACTIVE_BOOKING_STATUSES = [
  BOOKING_STATUSES.REQUESTED,
  BOOKING_STATUSES.PENDING_APPROVAL,
  BOOKING_STATUSES.CONFIRMED,
  BOOKING_STATUSES.AGREEMENT_PENDING,
  BOOKING_STATUSES.AGREEMENT_COMPLETED,
  BOOKING_STATUSES.COMPLETED,
] as const;

export type ActiveBookingStatus = (typeof ACTIVE_BOOKING_STATUSES)[number];

export const PROPERTY_STATUSES = {
  AVAILABLE: 'Available',
  HOLD: 'Hold',
  RESERVED: 'Reserved',
  BOOKED: 'Booked',
  SOLD: 'Sold',
  BLOCKED: 'Blocked',
} as const;

export type PropertyStatus = (typeof PROPERTY_STATUSES)[keyof typeof PROPERTY_STATUSES];

export const PAYMENT_STATUSES = {
  DRAFT: 'Draft',
  RECEIVED: 'Received',
  POSTED: 'Posted',
  REVERSED: 'Reversed',
  CANCELLED: 'Cancelled',
} as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[keyof typeof PAYMENT_STATUSES];

export const CHEQUE_STATUSES = {
  PENDING: 'Pending',
  CLEARED: 'Cleared',
  BOUNCED: 'Bounced',
} as const;

export type ChequeStatus = (typeof CHEQUE_STATUSES)[keyof typeof CHEQUE_STATUSES];

export const APPROVAL_STATUSES = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  AUTO_APPROVED: 'AUTO_APPROVED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
} as const;

export type ApprovalStatus = (typeof APPROVAL_STATUSES)[keyof typeof APPROVAL_STATUSES];

export const INSTALLMENT_PAYMENT_STATES = {
  UNPAID: 'Unpaid',
  PARTIALLY_PAID: 'Partially Paid',
  PAID: 'Paid',
  WAIVED: 'Waived',
  CANCELLED: 'Cancelled',
} as const;

export type InstallmentPaymentState =
  (typeof INSTALLMENT_PAYMENT_STATES)[keyof typeof INSTALLMENT_PAYMENT_STATES];

export const INSTALLMENT_TIMING_STATES = {
  UPCOMING: 'Upcoming',
  DUE_TODAY: 'Due Today',
  OVERDUE: 'Overdue',
} as const;

export type InstallmentTimingState =
  (typeof INSTALLMENT_TIMING_STATES)[keyof typeof INSTALLMENT_TIMING_STATES];

export const LEAD_STATUSES = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  INTERESTED: 'Interested',
  QUALIFIED: 'Qualified',
  SITE_VISIT: 'Site Visit',
  NEGOTIATION: 'Negotiation',
  BOOKING: 'Booking',
  CUSTOMER: 'Customer',
  LOST: 'Lost',
} as const;

export type LeadStatus = (typeof LEAD_STATUSES)[keyof typeof LEAD_STATUSES];

export const QUOTATION_STATUSES = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED: 'Approved',
  SENT: 'Sent',
  CONVERTED: 'Converted',
  EXPIRED: 'Expired',
  REJECTED: 'Rejected',
} as const;

export type QuotationStatus = (typeof QUOTATION_STATUSES)[keyof typeof QUOTATION_STATUSES];

export const JOURNAL_STATUSES = {
  DRAFT: 'Draft',
  REVIEW: 'Review',
  POSTED: 'Posted',
  LOCKED: 'Locked',
  REVERSED: 'Reversed',
} as const;

export type JournalStatus = (typeof JOURNAL_STATUSES)[keyof typeof JOURNAL_STATUSES];

export const ACCOUNTING_PERIOD_STATUSES = {
  OPEN: 'Open',
  CLOSED: 'Closed',
  LOCKED: 'Locked',
} as const;

export type AccountingPeriodStatus =
  (typeof ACCOUNTING_PERIOD_STATUSES)[keyof typeof ACCOUNTING_PERIOD_STATUSES];
