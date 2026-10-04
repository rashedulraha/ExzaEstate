import { describe, expect, it } from 'vitest';
import { ConflictException } from '@nestjs/common';
import { BOOKING_STATUSES, ERROR_CODES, PROPERTY_STATUSES } from '@exzaestate/shared';
import {
  ALLOWED_BOOKING_TRANSITIONS,
  assertBookingTransition,
  canTransitionBooking,
  isActiveBookingStatus,
  mapBookingStatusToPropertyStatus,
} from './booking.state-machine.js';

describe('Booking State Machine (PRD §9.1)', () => {
  describe('Allowed Transitions', () => {
    it('allows valid transitions from REQUESTED', () => {
      expect(
        canTransitionBooking(BOOKING_STATUSES.REQUESTED, BOOKING_STATUSES.PENDING_APPROVAL),
      ).toBe(true);
      expect(canTransitionBooking(BOOKING_STATUSES.REQUESTED, BOOKING_STATUSES.CONFIRMED)).toBe(
        true,
      );
      expect(canTransitionBooking(BOOKING_STATUSES.REQUESTED, BOOKING_STATUSES.CANCELLED)).toBe(
        true,
      );
    });

    it('allows valid transitions from PENDING_APPROVAL', () => {
      expect(
        canTransitionBooking(BOOKING_STATUSES.PENDING_APPROVAL, BOOKING_STATUSES.REQUESTED),
      ).toBe(true);
      expect(
        canTransitionBooking(BOOKING_STATUSES.PENDING_APPROVAL, BOOKING_STATUSES.CONFIRMED),
      ).toBe(true);
      expect(
        canTransitionBooking(BOOKING_STATUSES.PENDING_APPROVAL, BOOKING_STATUSES.CANCELLED),
      ).toBe(true);
    });

    it('allows valid transitions from CONFIRMED', () => {
      expect(
        canTransitionBooking(BOOKING_STATUSES.CONFIRMED, BOOKING_STATUSES.AGREEMENT_PENDING),
      ).toBe(true);
      expect(canTransitionBooking(BOOKING_STATUSES.CONFIRMED, BOOKING_STATUSES.CANCELLED)).toBe(
        true,
      );
    });

    it('allows valid transitions from AGREEMENT_PENDING', () => {
      expect(
        canTransitionBooking(
          BOOKING_STATUSES.AGREEMENT_PENDING,
          BOOKING_STATUSES.AGREEMENT_COMPLETED,
        ),
      ).toBe(true);
      expect(
        canTransitionBooking(BOOKING_STATUSES.AGREEMENT_PENDING, BOOKING_STATUSES.CANCELLED),
      ).toBe(true);
    });

    it('allows valid transitions from AGREEMENT_COMPLETED', () => {
      expect(
        canTransitionBooking(BOOKING_STATUSES.AGREEMENT_COMPLETED, BOOKING_STATUSES.COMPLETED),
      ).toBe(true);
      expect(
        canTransitionBooking(BOOKING_STATUSES.AGREEMENT_COMPLETED, BOOKING_STATUSES.CANCELLED),
      ).toBe(true);
      expect(
        canTransitionBooking(BOOKING_STATUSES.AGREEMENT_COMPLETED, BOOKING_STATUSES.TRANSFERRED),
      ).toBe(true);
    });

    it('allows valid transitions from COMPLETED', () => {
      expect(canTransitionBooking(BOOKING_STATUSES.COMPLETED, BOOKING_STATUSES.TRANSFERRED)).toBe(
        true,
      );
    });

    it('terminal statuses (CANCELLED, TRANSFERRED) have zero outgoing transitions', () => {
      expect(ALLOWED_BOOKING_TRANSITIONS[BOOKING_STATUSES.CANCELLED]).toEqual([]);
      expect(ALLOWED_BOOKING_TRANSITIONS[BOOKING_STATUSES.TRANSFERRED]).toEqual([]);
    });
  });

  describe('Invalid Transitions & Exception Throwing', () => {
    it('disallows self-transitions', () => {
      expect(canTransitionBooking(BOOKING_STATUSES.REQUESTED, BOOKING_STATUSES.REQUESTED)).toBe(
        false,
      );
      expect(() =>
        assertBookingTransition(BOOKING_STATUSES.REQUESTED, BOOKING_STATUSES.REQUESTED),
      ).toThrow(ConflictException);
    });

    it('disallows skipping steps (e.g. REQUESTED -> COMPLETED)', () => {
      expect(canTransitionBooking(BOOKING_STATUSES.REQUESTED, BOOKING_STATUSES.COMPLETED)).toBe(
        false,
      );
      try {
        assertBookingTransition(BOOKING_STATUSES.REQUESTED, BOOKING_STATUSES.COMPLETED);
        expect.unreachable('Should have thrown');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(ConflictException);
        const resp = (err as ConflictException).getResponse() as { code: string };
        expect(resp.code).toBe(ERROR_CODES.INVALID_STATE_TRANSITION);
      }
    });

    it('disallows backwards transitions from CONFIRMED to REQUESTED', () => {
      expect(canTransitionBooking(BOOKING_STATUSES.CONFIRMED, BOOKING_STATUSES.REQUESTED)).toBe(
        false,
      );
      expect(() =>
        assertBookingTransition(BOOKING_STATUSES.CONFIRMED, BOOKING_STATUSES.REQUESTED),
      ).toThrow(ConflictException);
    });

    it('disallows transitioning out of CANCELLED', () => {
      expect(canTransitionBooking(BOOKING_STATUSES.CANCELLED, BOOKING_STATUSES.CONFIRMED)).toBe(
        false,
      );
      expect(() =>
        assertBookingTransition(BOOKING_STATUSES.CANCELLED, BOOKING_STATUSES.CONFIRMED),
      ).toThrow(ConflictException);
    });
  });

  describe('Property Status Mapping (PRD §9.1 Table)', () => {
    it('maps REQUESTED and PENDING_APPROVAL to Reserved', () => {
      expect(mapBookingStatusToPropertyStatus(BOOKING_STATUSES.REQUESTED)).toBe(
        PROPERTY_STATUSES.RESERVED,
      );
      expect(mapBookingStatusToPropertyStatus(BOOKING_STATUSES.PENDING_APPROVAL)).toBe(
        PROPERTY_STATUSES.RESERVED,
      );
    });

    it('maps CONFIRMED, AGREEMENT_PENDING, AGREEMENT_COMPLETED to Booked', () => {
      expect(mapBookingStatusToPropertyStatus(BOOKING_STATUSES.CONFIRMED)).toBe(
        PROPERTY_STATUSES.BOOKED,
      );
      expect(mapBookingStatusToPropertyStatus(BOOKING_STATUSES.AGREEMENT_PENDING)).toBe(
        PROPERTY_STATUSES.BOOKED,
      );
      expect(mapBookingStatusToPropertyStatus(BOOKING_STATUSES.AGREEMENT_COMPLETED)).toBe(
        PROPERTY_STATUSES.BOOKED,
      );
    });

    it('maps COMPLETED to Sold', () => {
      expect(mapBookingStatusToPropertyStatus(BOOKING_STATUSES.COMPLETED)).toBe(
        PROPERTY_STATUSES.SOLD,
      );
    });

    it('maps CANCELLED to Available (or custom policy Blocked)', () => {
      expect(mapBookingStatusToPropertyStatus(BOOKING_STATUSES.CANCELLED)).toBe(
        PROPERTY_STATUSES.AVAILABLE,
      );
      expect(
        mapBookingStatusToPropertyStatus(BOOKING_STATUSES.CANCELLED, PROPERTY_STATUSES.BLOCKED),
      ).toBe(PROPERTY_STATUSES.BLOCKED);
    });
  });

  describe('Active Booking Statuses (Covered by Partial Unique Index)', () => {
    it('correctly identifies the 6 active booking statuses', () => {
      expect(isActiveBookingStatus(BOOKING_STATUSES.REQUESTED)).toBe(true);
      expect(isActiveBookingStatus(BOOKING_STATUSES.PENDING_APPROVAL)).toBe(true);
      expect(isActiveBookingStatus(BOOKING_STATUSES.CONFIRMED)).toBe(true);
      expect(isActiveBookingStatus(BOOKING_STATUSES.AGREEMENT_PENDING)).toBe(true);
      expect(isActiveBookingStatus(BOOKING_STATUSES.AGREEMENT_COMPLETED)).toBe(true);
      expect(isActiveBookingStatus(BOOKING_STATUSES.COMPLETED)).toBe(true);

      // Inactive
      expect(isActiveBookingStatus(BOOKING_STATUSES.CANCELLED)).toBe(false);
      expect(isActiveBookingStatus(BOOKING_STATUSES.TRANSFERRED)).toBe(false);
    });
  });
});
