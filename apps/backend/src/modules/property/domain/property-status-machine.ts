/**
 * property-status-machine.ts — Pure Domain State Machine for Property Statuses
 *
 * Implements property lifecycle transitions and workflow constraints:
 * Available, Hold, Reserved, Booked, Sold, Blocked
 * Defined in prd.md MOD-PROPERTY, §9.1, architecture.md §7.1, §18.1
 */

import type { CanonicalPropertyStatus } from '../dto/query-property.dto.js';

export interface BookingStatusEventInput {
  bookingId: string;
  status:
    | 'REQUESTED'
    | 'PENDING_APPROVAL'
    | 'CONFIRMED'
    | 'AGREEMENT_PENDING'
    | 'AGREEMENT_COMPLETED'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'TRANSFERRED';
  actorId?: string;
  reason?: string;
  cancellationPropertyStatus?: 'Available' | 'Blocked';
}

export interface TransitionParams {
  toStatus: CanonicalPropertyStatus;
  allowedFromStatuses?: readonly CanonicalPropertyStatus[];
  reason: string;
  action: string;
  userId?: string;
  holdExpiresAt?: Date | null;
  blockReason?: string | null;
  metadata?: Record<string, unknown>;
}

export const ALLOWED_STATUS_ACTIONS = {
  HOLD: {
    from: ['Available'] as readonly CanonicalPropertyStatus[],
    to: 'Hold' as CanonicalPropertyStatus,
    action: 'PROPERTY_HOLD',
  },
  RELEASE_HOLD: {
    from: ['Hold'] as readonly CanonicalPropertyStatus[],
    to: 'Available' as CanonicalPropertyStatus,
    action: 'PROPERTY_HOLD_RELEASED',
  },
  BLOCK: {
    from: ['Available', 'Hold'] as readonly CanonicalPropertyStatus[],
    to: 'Blocked' as CanonicalPropertyStatus,
    action: 'PROPERTY_BLOCKED',
  },
  UNBLOCK: {
    from: ['Blocked'] as readonly CanonicalPropertyStatus[],
    to: 'Available' as CanonicalPropertyStatus,
    action: 'PROPERTY_UNBLOCKED',
  },
} as const;

/**
 * Maps a sales/booking lifecycle event to the canonical property inventory status.
 * Returns null if the booking status change does not affect property inventory status (e.g. TRANSFERRED).
 */
export function mapBookingStatusToPropertyStatus(
  status: BookingStatusEventInput['status'],
  cancellationStatus: 'Available' | 'Blocked' = 'Available',
): CanonicalPropertyStatus | null {
  switch (status) {
    case 'REQUESTED':
    case 'PENDING_APPROVAL':
      return 'Reserved';
    case 'CONFIRMED':
    case 'AGREEMENT_PENDING':
    case 'AGREEMENT_COMPLETED':
      return 'Booked';
    case 'COMPLETED':
      return 'Sold';
    case 'CANCELLED':
      return cancellationStatus;
    case 'TRANSFERRED':
      return null;
  }
}

/**
 * Validates whether a property status transition is permitted from the current status.
 */
export function validateStatusTransition(
  currentStatus: string,
  toStatus: CanonicalPropertyStatus,
  allowedFromStatuses?: readonly CanonicalPropertyStatus[],
): { valid: boolean; error?: string } {
  if (
    allowedFromStatuses &&
    !allowedFromStatuses.includes(currentStatus as CanonicalPropertyStatus)
  ) {
    return {
      valid: false,
      error: `Cannot transition property from "${currentStatus}" to "${toStatus}"`,
    };
  }
  return { valid: true };
}
