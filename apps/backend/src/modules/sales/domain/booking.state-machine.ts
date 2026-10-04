import { ConflictException } from '@nestjs/common';
import {
  ACTIVE_BOOKING_STATUSES,
  type ActiveBookingStatus,
  BOOKING_STATUSES,
  type BookingStatus,
  ERROR_CODES,
  PROPERTY_STATUSES,
  type PropertyStatus,
} from '@exzaestate/shared';

/**
 * PRD §9.1 Status Machines: Booking Status
 *
 * Allowed transitions (anything else is rejected):
 * - REQUESTED → PENDING_APPROVAL | CONFIRMED | CANCELLED
 * - PENDING_APPROVAL → REQUESTED | CONFIRMED | CANCELLED
 * - CONFIRMED → AGREEMENT_PENDING | CANCELLED
 * - AGREEMENT_PENDING → AGREEMENT_COMPLETED | CANCELLED
 * - AGREEMENT_COMPLETED → COMPLETED | CANCELLED | TRANSFERRED
 * - COMPLETED → TRANSFERRED
 */
export const ALLOWED_BOOKING_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  [BOOKING_STATUSES.REQUESTED]: [
    BOOKING_STATUSES.PENDING_APPROVAL,
    BOOKING_STATUSES.CONFIRMED,
    BOOKING_STATUSES.CANCELLED,
  ],
  [BOOKING_STATUSES.PENDING_APPROVAL]: [
    BOOKING_STATUSES.REQUESTED,
    BOOKING_STATUSES.CONFIRMED,
    BOOKING_STATUSES.CANCELLED,
  ],
  [BOOKING_STATUSES.CONFIRMED]: [BOOKING_STATUSES.AGREEMENT_PENDING, BOOKING_STATUSES.CANCELLED],
  [BOOKING_STATUSES.AGREEMENT_PENDING]: [
    BOOKING_STATUSES.AGREEMENT_COMPLETED,
    BOOKING_STATUSES.CANCELLED,
  ],
  [BOOKING_STATUSES.AGREEMENT_COMPLETED]: [
    BOOKING_STATUSES.COMPLETED,
    BOOKING_STATUSES.CANCELLED,
    BOOKING_STATUSES.TRANSFERRED,
  ],
  [BOOKING_STATUSES.COMPLETED]: [BOOKING_STATUSES.TRANSFERRED],
  [BOOKING_STATUSES.CANCELLED]: [],
  [BOOKING_STATUSES.TRANSFERRED]: [],
};

/**
 * Checks whether a transition between two booking states is valid.
 */
export function canTransitionBooking(fromStatus: BookingStatus, toStatus: BookingStatus): boolean {
  if (fromStatus === toStatus) {
    return false;
  }
  const allowed = ALLOWED_BOOKING_TRANSITIONS[fromStatus];
  return allowed ? allowed.includes(toStatus) : false;
}

/**
 * Asserts that a booking transition is allowed per PRD §9.1.
 * Throws ConflictException (409) with INVALID_STATE_TRANSITION on invalid state.
 */
export function assertBookingTransition(fromStatus: BookingStatus, toStatus: BookingStatus): void {
  if (!canTransitionBooking(fromStatus, toStatus)) {
    throw new ConflictException({
      code: ERROR_CODES.INVALID_STATE_TRANSITION,
      message: `Invalid booking state transition from "${fromStatus}" to "${toStatus}". Allowed targets: [${(ALLOWED_BOOKING_TRANSITIONS[fromStatus] || []).join(', ')}]`,
    });
  }
}

/**
 * Maps a booking status to the required property status (PRD §9.1 table).
 */
export function mapBookingStatusToPropertyStatus(
  bookingStatus: BookingStatus,
  cancellationPolicyStatus: PropertyStatus = PROPERTY_STATUSES.AVAILABLE,
): PropertyStatus {
  switch (bookingStatus) {
    case BOOKING_STATUSES.REQUESTED:
    case BOOKING_STATUSES.PENDING_APPROVAL:
      return PROPERTY_STATUSES.RESERVED;
    case BOOKING_STATUSES.CONFIRMED:
    case BOOKING_STATUSES.AGREEMENT_PENDING:
    case BOOKING_STATUSES.AGREEMENT_COMPLETED:
      return PROPERTY_STATUSES.BOOKED;
    case BOOKING_STATUSES.COMPLETED:
      return PROPERTY_STATUSES.SOLD;
    case BOOKING_STATUSES.CANCELLED:
      return cancellationPolicyStatus;
    case BOOKING_STATUSES.TRANSFERRED:
      // Derived from successor booking; stays Booked or Sold
      return PROPERTY_STATUSES.BOOKED;
  }
}

/**
 * Checks whether a booking status is one of the 6 active statuses covered by DB partial index.
 */
export function isActiveBookingStatus(status: string): status is ActiveBookingStatus {
  return (ACTIVE_BOOKING_STATUSES as readonly string[]).includes(status);
}
