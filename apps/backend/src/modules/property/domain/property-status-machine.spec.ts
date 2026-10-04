import { describe, expect, it } from 'vitest';
import {
  ALLOWED_STATUS_ACTIONS,
  mapBookingStatusToPropertyStatus,
  validateStatusTransition,
} from './property-status-machine.js';

describe('PropertyStatusMachine (Pure Domain Functionality)', () => {
  describe('mapBookingStatusToPropertyStatus', () => {
    it('maps REQUESTED and PENDING_APPROVAL to Reserved', () => {
      expect(mapBookingStatusToPropertyStatus('REQUESTED')).toBe('Reserved');
      expect(mapBookingStatusToPropertyStatus('PENDING_APPROVAL')).toBe('Reserved');
    });

    it('maps CONFIRMED, AGREEMENT_PENDING, and AGREEMENT_COMPLETED to Booked', () => {
      expect(mapBookingStatusToPropertyStatus('CONFIRMED')).toBe('Booked');
      expect(mapBookingStatusToPropertyStatus('AGREEMENT_PENDING')).toBe('Booked');
      expect(mapBookingStatusToPropertyStatus('AGREEMENT_COMPLETED')).toBe('Booked');
    });

    it('maps COMPLETED to Sold', () => {
      expect(mapBookingStatusToPropertyStatus('COMPLETED')).toBe('Sold');
    });

    it('maps CANCELLED to Available by default or specified cancellation status', () => {
      expect(mapBookingStatusToPropertyStatus('CANCELLED')).toBe('Available');
      expect(mapBookingStatusToPropertyStatus('CANCELLED', 'Blocked')).toBe('Blocked');
    });

    it('returns null for TRANSFERRED', () => {
      expect(mapBookingStatusToPropertyStatus('TRANSFERRED')).toBeNull();
    });
  });

  describe('validateStatusTransition', () => {
    it('allows hold from Available', () => {
      const result = validateStatusTransition(
        'Available',
        'Hold',
        ALLOWED_STATUS_ACTIONS.HOLD.from,
      );
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('rejects hold from Booked or Sold', () => {
      const bookedResult = validateStatusTransition(
        'Booked',
        'Hold',
        ALLOWED_STATUS_ACTIONS.HOLD.from,
      );
      expect(bookedResult.valid).toBe(false);
      expect(bookedResult.error).toContain('Cannot transition property from "Booked" to "Hold"');

      const soldResult = validateStatusTransition('Sold', 'Hold', ALLOWED_STATUS_ACTIONS.HOLD.from);
      expect(soldResult.valid).toBe(false);
      expect(soldResult.error).toContain('Cannot transition property from "Sold" to "Hold"');
    });

    it('allows release hold only from Hold', () => {
      const valid = validateStatusTransition(
        'Hold',
        'Available',
        ALLOWED_STATUS_ACTIONS.RELEASE_HOLD.from,
      );
      expect(valid.valid).toBe(true);

      const invalid = validateStatusTransition(
        'Available',
        'Available',
        ALLOWED_STATUS_ACTIONS.RELEASE_HOLD.from,
      );
      expect(invalid.valid).toBe(false);
    });

    it('allows block from Available and Hold', () => {
      expect(
        validateStatusTransition('Available', 'Blocked', ALLOWED_STATUS_ACTIONS.BLOCK.from).valid,
      ).toBe(true);
      expect(
        validateStatusTransition('Hold', 'Blocked', ALLOWED_STATUS_ACTIONS.BLOCK.from).valid,
      ).toBe(true);
      expect(
        validateStatusTransition('Booked', 'Blocked', ALLOWED_STATUS_ACTIONS.BLOCK.from).valid,
      ).toBe(false);
    });

    it('allows unblock from Blocked', () => {
      expect(
        validateStatusTransition('Blocked', 'Available', ALLOWED_STATUS_ACTIONS.UNBLOCK.from).valid,
      ).toBe(true);
      expect(
        validateStatusTransition('Hold', 'Available', ALLOWED_STATUS_ACTIONS.UNBLOCK.from).valid,
      ).toBe(false);
    });

    it('allows any transition when allowedFromStatuses is undefined (e.g. manual override)', () => {
      expect(validateStatusTransition('Blocked', 'Sold', undefined).valid).toBe(true);
      expect(validateStatusTransition('Sold', 'Available', undefined).valid).toBe(true);
    });
  });
});
