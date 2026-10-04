import { DOMAIN_EVENTS } from '@exzaestate/shared';

/**
 * Property domain event names and typed payloads
 * Conforms to architecture.md §7.1 and §18.2 (DoD-BE)
 */
export const PROPERTY_EVENTS = {
  CREATED: 'property.created',
  UPDATED: 'property.updated',
  DELETED: 'property.deleted',
  STATUS_CHANGED: DOMAIN_EVENTS.PROPERTY_STATUS_CHANGED,
  HOLD_EXPIRED: DOMAIN_EVENTS.PROPERTY_HOLD_EXPIRED,
} as const;

export type PropertyEventType = (typeof PROPERTY_EVENTS)[keyof typeof PROPERTY_EVENTS];

export interface PropertyCreatedEventPayload {
  propertyId: string;
  companyId: string;
  projectId: string;
  code: string;
  type: string;
  status: string;
  netPricePaisa: string;
  createdById?: string;
  timestamp: string;
}

export interface PropertyUpdatedEventPayload {
  propertyId: string;
  companyId: string;
  projectId: string;
  code: string;
  updatedById?: string;
  timestamp: string;
}

export interface PropertyDeletedEventPayload {
  propertyId: string;
  companyId: string;
  deletedById?: string;
  timestamp: string;
}

export interface PropertyStatusChangedEventPayload {
  propertyId: string;
  companyId: string;
  fromStatus: string;
  toStatus: string;
  action: string;
  reason?: string | null;
  actorId?: string | null;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface PropertyHoldExpiredEventPayload {
  propertyId: string;
  companyId: string;
  holdExpiresAt: string;
  timestamp: string;
}
