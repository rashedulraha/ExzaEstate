import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Info,
  GitBranch,
  Ban,
  Lock,
  CircleDashed,
} from 'lucide-react';

export type StatusFamily =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'special'
  | 'void'
  | 'primary'
  | 'neutral';

export interface StatusBadgeProps {
  domain?: string;
  value: string;
  className?: string;
}

interface StatusDefinition {
  family: StatusFamily;
  displayLabel?: string;
}

// Complete status map per design.md §2.5
export const STATUS_MAP: Record<string, Record<string, StatusDefinition>> = {
  property: {
    AVAILABLE: { family: 'success', displayLabel: 'Available' },
    HOLD: { family: 'void', displayLabel: 'Hold' },
    RESERVED: { family: 'warning', displayLabel: 'Reserved' },
    BOOKED: { family: 'special', displayLabel: 'Booked' },
    SOLD: { family: 'primary', displayLabel: 'Sold' },
    CANCELLED: { family: 'void', displayLabel: 'Cancelled' },
    TRANSFERRED: { family: 'info', displayLabel: 'Transferred' },
    BLOCKED: { family: 'void', displayLabel: 'Blocked' },
  },
  booking: {
    REQUESTED: { family: 'info', displayLabel: 'Requested' },
    PENDING_APPROVAL: { family: 'warning', displayLabel: 'Pending Approval' },
    CONFIRMED: { family: 'success', displayLabel: 'Confirmed' },
    AGREEMENT_PENDING: { family: 'warning', displayLabel: 'Agreement Pending' },
    AGREEMENT_COMPLETED: { family: 'primary', displayLabel: 'Agreement Completed' },
    COMPLETED: { family: 'primary', displayLabel: 'Completed' },
    CANCELLED: { family: 'void', displayLabel: 'Cancelled' },
    TRANSFERRED: { family: 'info', displayLabel: 'Transferred' },
  },
  installment: {
    UPCOMING: { family: 'neutral', displayLabel: 'Upcoming' },
    DUE_TODAY: { family: 'info', displayLabel: 'Due Today' },
    PARTIALLY_PAID: { family: 'warning', displayLabel: 'Partially Paid' },
    PAID: { family: 'success', displayLabel: 'Paid' },
    OVERDUE: { family: 'danger', displayLabel: 'Overdue' },
    WAIVED: { family: 'special', displayLabel: 'Waived' },
    CANCELLED: { family: 'void', displayLabel: 'Cancelled' },
  },
  payment: {
    DRAFT: { family: 'neutral', displayLabel: 'Draft' },
    RECEIVED: { family: 'info', displayLabel: 'Received' },
    POSTED: { family: 'success', displayLabel: 'Posted' },
    CANCELLED: { family: 'void', displayLabel: 'Cancelled' },
    REVERSED: { family: 'special', displayLabel: 'Reversed' },
  },
  cheque: {
    PENDING: { family: 'warning', displayLabel: 'Pending' },
    CLEARED: { family: 'success', displayLabel: 'Cleared' },
    BOUNCED: { family: 'danger', displayLabel: 'Bounced' },
  },
  lead: {
    NEW: { family: 'neutral', displayLabel: 'New' },
    CONTACTED: { family: 'info', displayLabel: 'Contacted' },
    INTERESTED: { family: 'info', displayLabel: 'Interested' },
    QUALIFIED: { family: 'warning', displayLabel: 'Qualified' },
    SITE_VISIT: { family: 'info', displayLabel: 'Site Visit' },
    NEGOTIATION: { family: 'special', displayLabel: 'Negotiation' },
    BOOKING: { family: 'success', displayLabel: 'Booking' },
    CUSTOMER: { family: 'primary', displayLabel: 'Customer' },
    LOST: { family: 'void', displayLabel: 'Lost' },
  },
  journal: {
    DRAFT: { family: 'neutral', displayLabel: 'Draft' },
    REVIEW: { family: 'warning', displayLabel: 'Review' },
    POSTED: { family: 'success', displayLabel: 'Posted' },
    LOCKED: { family: 'primary', displayLabel: 'Locked' },
    REVERSED: { family: 'special', displayLabel: 'Reversed' },
  },
  approval: {
    PENDING: { family: 'warning', displayLabel: 'Pending' },
    APPROVED: { family: 'success', displayLabel: 'Approved' },
    REJECTED: { family: 'danger', displayLabel: 'Rejected' },
    EXPIRED: { family: 'void', displayLabel: 'Expired' },
    CANCELLED: { family: 'void', displayLabel: 'Cancelled' },
  },
  expense: {
    REQUESTED: { family: 'info', displayLabel: 'Requested' },
    APPROVED: { family: 'success', displayLabel: 'Approved' },
    VERIFIED: { family: 'success', displayLabel: 'Verified' },
    PAID: { family: 'primary', displayLabel: 'Settled' },
    REJECTED: { family: 'danger', displayLabel: 'Rejected' },
  },
  purchaseOrder: {
    DRAFT: { family: 'neutral', displayLabel: 'Draft' },
    ORDERED: { family: 'info', displayLabel: 'Ordered' },
    PARTIALLY_RECEIVED: { family: 'warning', displayLabel: 'Partially Received' },
    RECEIVED: { family: 'success', displayLabel: 'Goods received' },
    CLOSED: { family: 'primary', displayLabel: 'Closed' },
    CANCELLED: { family: 'void', displayLabel: 'Cancelled' },
  },
  commission: {
    EARNED: { family: 'neutral', displayLabel: 'Earned' },
    APPROVED: { family: 'success', displayLabel: 'Approved' },
    PAID: { family: 'primary', displayLabel: 'Settled' },
  },
  accountingPeriod: {
    OPEN: { family: 'success', displayLabel: 'Open' },
    CLOSED: { family: 'warning', displayLabel: 'Period closed' },
    LOCKED: { family: 'primary', displayLabel: 'Locked' },
  },
};

const familyStyles: Record<StatusFamily, { badge: string; icon: React.ReactElement }> = {
  success: {
    badge: 'text-success bg-success/12 border border-success/20',
    icon: <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
  },
  warning: {
    badge: 'text-warning bg-warning/12 border border-warning/20',
    icon: <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
  },
  danger: {
    badge: 'text-danger bg-danger/12 border border-danger/20',
    icon: <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
  },
  info: {
    badge: 'text-info bg-info/12 border border-info/20',
    icon: <Info className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
  },
  special: {
    badge: 'text-special bg-special/12 border border-special/20',
    icon: <GitBranch className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
  },
  void: {
    badge: 'text-void bg-void/12 border border-void/20',
    icon: <Ban className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
  },
  primary: {
    badge: 'text-primary-fg bg-primary/12 border border-primary/20',
    icon: <Lock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
  },
  neutral: {
    badge: 'text-text-muted bg-surface-sunken border border-border',
    icon: <CircleDashed className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
  },
};

export function StatusBadge({ domain = 'property', value, className = '' }: StatusBadgeProps) {
  const normalizedKey = value.toUpperCase().replace(/\s+/g, '_');
  const domainMap = STATUS_MAP[domain];
  const definition = domainMap ? domainMap[normalizedKey] : undefined;

  const family: StatusFamily = definition?.family ?? 'neutral';
  const label = definition?.displayLabel ?? value;
  const config = familyStyles[family];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-caption font-medium select-none ${config.badge} ${className}`}
    >
      {config.icon}
      <span>{label}</span>
    </span>
  );
}
