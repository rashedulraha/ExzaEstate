import { describe, expect, it } from 'vitest';
import { ERROR_CODES, LEAD_STATUSES } from '@exzaestate/shared';
import { validateLeadTransition } from './lead-pipeline-machine.js';

interface ErrorWithResponse {
  response?: {
    code?: string;
  };
}

describe('LeadPipelineMachine', () => {
  it('allows same-status transitions as no-op', () => {
    expect(() =>
      validateLeadTransition({
        currentStatus: LEAD_STATUSES.NEW,
        targetStatus: LEAD_STATUSES.NEW,
      }),
    ).not.toThrow();
  });

  it('allows valid progressive pipeline transitions', () => {
    expect(() =>
      validateLeadTransition({
        currentStatus: LEAD_STATUSES.NEW,
        targetStatus: LEAD_STATUSES.CONTACTED,
      }),
    ).not.toThrow();

    expect(() =>
      validateLeadTransition({
        currentStatus: LEAD_STATUSES.CONTACTED,
        targetStatus: LEAD_STATUSES.INTERESTED,
      }),
    ).not.toThrow();

    expect(() =>
      validateLeadTransition({
        currentStatus: LEAD_STATUSES.INTERESTED,
        targetStatus: LEAD_STATUSES.QUALIFIED,
      }),
    ).not.toThrow();

    expect(() =>
      validateLeadTransition({
        currentStatus: LEAD_STATUSES.QUALIFIED,
        targetStatus: LEAD_STATUSES.SITE_VISIT,
      }),
    ).not.toThrow();

    expect(() =>
      validateLeadTransition({
        currentStatus: LEAD_STATUSES.SITE_VISIT,
        targetStatus: LEAD_STATUSES.NEGOTIATION,
      }),
    ).not.toThrow();

    expect(() =>
      validateLeadTransition({
        currentStatus: LEAD_STATUSES.NEGOTIATION,
        targetStatus: LEAD_STATUSES.BOOKING,
      }),
    ).not.toThrow();

    expect(() =>
      validateLeadTransition({
        currentStatus: LEAD_STATUSES.BOOKING,
        targetStatus: LEAD_STATUSES.CUSTOMER,
      }),
    ).not.toThrow();
  });

  it('allows transitioning to Lost from any active stage with a valid reason', () => {
    const activeStatuses = [
      LEAD_STATUSES.NEW,
      LEAD_STATUSES.CONTACTED,
      LEAD_STATUSES.INTERESTED,
      LEAD_STATUSES.QUALIFIED,
      LEAD_STATUSES.SITE_VISIT,
      LEAD_STATUSES.NEGOTIATION,
      LEAD_STATUSES.BOOKING,
    ];

    for (const status of activeStatuses) {
      expect(() =>
        validateLeadTransition({
          currentStatus: status,
          targetStatus: LEAD_STATUSES.LOST,
          lostReason: 'Budget constraints',
        }),
      ).not.toThrow();
    }
  });

  it('throws VALIDATION_ERROR when transitioning to Lost without a reason', () => {
    expect(() =>
      validateLeadTransition({
        currentStatus: LEAD_STATUSES.QUALIFIED,
        targetStatus: LEAD_STATUSES.LOST,
      }),
    ).toThrowError();

    try {
      validateLeadTransition({
        currentStatus: LEAD_STATUSES.QUALIFIED,
        targetStatus: LEAD_STATUSES.LOST,
        lostReason: '   ',
      });
      expect.unreachable();
    } catch (err: unknown) {
      const errorObj = err as ErrorWithResponse;
      expect(errorObj.response?.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    }
  });

  it('allows reopening a Lost lead to New or Contacted', () => {
    expect(() =>
      validateLeadTransition({
        currentStatus: LEAD_STATUSES.LOST,
        targetStatus: LEAD_STATUSES.NEW,
      }),
    ).not.toThrow();

    expect(() =>
      validateLeadTransition({
        currentStatus: LEAD_STATUSES.LOST,
        targetStatus: LEAD_STATUSES.CONTACTED,
      }),
    ).not.toThrow();
  });

  it('throws INVALID_STATE_TRANSITION for invalid backward or terminal transitions', () => {
    // Customer cannot transition to anything
    try {
      validateLeadTransition({
        currentStatus: LEAD_STATUSES.CUSTOMER,
        targetStatus: LEAD_STATUSES.NEW,
      });
      expect.unreachable();
    } catch (err: unknown) {
      const errorObj = err as ErrorWithResponse;
      expect(errorObj.response?.code).toBe(ERROR_CODES.INVALID_STATE_TRANSITION);
    }

    // Lost cannot jump directly to Booking
    try {
      validateLeadTransition({
        currentStatus: LEAD_STATUSES.LOST,
        targetStatus: LEAD_STATUSES.BOOKING,
      });
      expect.unreachable();
    } catch (err: unknown) {
      const errorObj = err as ErrorWithResponse;
      expect(errorObj.response?.code).toBe(ERROR_CODES.INVALID_STATE_TRANSITION);
    }
  });
});
