/**
 * lead-pipeline-machine.ts — Pure Domain State Machine for CRM Leads
 *
 * Defined in prd.md MOD-CRM, §9.5, FLOW-05
 * Statuses: New, Contacted, Interested, Qualified, Site Visit, Negotiation, Booking, Customer, Lost
 */

import { BadRequestException } from '@nestjs/common';
import { ERROR_CODES, LEAD_STATUSES, type LeadStatus } from '@exzaestate/shared';

export const PIPELINE_ORDER: readonly LeadStatus[] = [
  LEAD_STATUSES.NEW,
  LEAD_STATUSES.CONTACTED,
  LEAD_STATUSES.INTERESTED,
  LEAD_STATUSES.QUALIFIED,
  LEAD_STATUSES.SITE_VISIT,
  LEAD_STATUSES.NEGOTIATION,
  LEAD_STATUSES.BOOKING,
  LEAD_STATUSES.CUSTOMER,
] as const;

export const ALLOWED_LEAD_TRANSITIONS: Record<LeadStatus, readonly LeadStatus[]> = {
  [LEAD_STATUSES.NEW]: [
    LEAD_STATUSES.CONTACTED,
    LEAD_STATUSES.INTERESTED,
    LEAD_STATUSES.QUALIFIED,
    LEAD_STATUSES.SITE_VISIT,
    LEAD_STATUSES.NEGOTIATION,
    LEAD_STATUSES.BOOKING,
    LEAD_STATUSES.CUSTOMER,
    LEAD_STATUSES.LOST,
  ],
  [LEAD_STATUSES.CONTACTED]: [
    LEAD_STATUSES.INTERESTED,
    LEAD_STATUSES.QUALIFIED,
    LEAD_STATUSES.SITE_VISIT,
    LEAD_STATUSES.NEGOTIATION,
    LEAD_STATUSES.BOOKING,
    LEAD_STATUSES.CUSTOMER,
    LEAD_STATUSES.LOST,
  ],
  [LEAD_STATUSES.INTERESTED]: [
    LEAD_STATUSES.QUALIFIED,
    LEAD_STATUSES.SITE_VISIT,
    LEAD_STATUSES.NEGOTIATION,
    LEAD_STATUSES.BOOKING,
    LEAD_STATUSES.CUSTOMER,
    LEAD_STATUSES.LOST,
  ],
  [LEAD_STATUSES.QUALIFIED]: [
    LEAD_STATUSES.SITE_VISIT,
    LEAD_STATUSES.NEGOTIATION,
    LEAD_STATUSES.BOOKING,
    LEAD_STATUSES.CUSTOMER,
    LEAD_STATUSES.LOST,
  ],
  [LEAD_STATUSES.SITE_VISIT]: [
    LEAD_STATUSES.NEGOTIATION,
    LEAD_STATUSES.BOOKING,
    LEAD_STATUSES.CUSTOMER,
    LEAD_STATUSES.LOST,
  ],
  [LEAD_STATUSES.NEGOTIATION]: [LEAD_STATUSES.BOOKING, LEAD_STATUSES.CUSTOMER, LEAD_STATUSES.LOST],
  [LEAD_STATUSES.BOOKING]: [LEAD_STATUSES.CUSTOMER, LEAD_STATUSES.LOST],
  [LEAD_STATUSES.CUSTOMER]: [], // Customer is terminal
  [LEAD_STATUSES.LOST]: [LEAD_STATUSES.NEW, LEAD_STATUSES.CONTACTED],
};

export interface ValidateLeadTransitionInput {
  currentStatus: LeadStatus;
  targetStatus: LeadStatus;
  lostReason?: string | null;
}

export function validateLeadTransition(input: ValidateLeadTransitionInput): void {
  const { currentStatus, targetStatus, lostReason } = input;

  if (currentStatus === targetStatus) {
    return;
  }

  const allowedNext = ALLOWED_LEAD_TRANSITIONS[currentStatus];
  if (!allowedNext || !allowedNext.includes(targetStatus)) {
    throw new BadRequestException({
      code: ERROR_CODES.INVALID_STATE_TRANSITION,
      message: `Invalid lead status transition from "${currentStatus}" to "${targetStatus}"`,
    });
  }

  if (targetStatus === LEAD_STATUSES.LOST) {
    if (!lostReason || !lostReason.trim()) {
      throw new BadRequestException({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'A reason is mandatory when marking a lead as Lost',
      });
    }
  }
}
