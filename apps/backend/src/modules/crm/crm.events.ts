import { DOMAIN_EVENTS } from '@exzaestate/shared';

export const CRM_EVENTS = {
  LEAD_CREATED: DOMAIN_EVENTS.LEAD_CREATED,
  LEAD_CONTACTED: DOMAIN_EVENTS.LEAD_CONTACTED,
  LEAD_QUALIFIED: DOMAIN_EVENTS.LEAD_QUALIFIED,
  LEAD_CONVERTED: DOMAIN_EVENTS.LEAD_CONVERTED,
  LEAD_ASSIGNED: 'lead.assigned',
  LEAD_STATUS_CHANGED: 'lead.status_changed',
  FOLLOW_UP_CREATED: DOMAIN_EVENTS.FOLLOW_UP_CREATED,
  FOLLOW_UP_COMPLETED: DOMAIN_EVENTS.FOLLOW_UP_COMPLETED,
  FOLLOW_UP_OVERDUE: DOMAIN_EVENTS.FOLLOW_UP_OVERDUE,
} as const;

export interface FollowUpCreatedEventPayload {
  followUpId: string;
  companyId: string;
  leadId?: string | null;
  customerId?: string | null;
  type: string;
  dueDate: string;
  priority: string;
  assignedToId: string;
  actorId?: string;
}

export interface FollowUpCompletedEventPayload {
  followUpId: string;
  companyId: string;
  leadId?: string | null;
  customerId?: string | null;
  type: string;
  outcome: string;
  completedById: string;
  nextFollowUpId?: string | null;
}

export interface FollowUpOverdueEventPayload {
  followUpId: string;
  companyId: string;
  leadId?: string | null;
  leadName?: string | null;
  type: string;
  dueDate: string;
  assignedToId: string;
}

export interface LeadCreatedEventPayload {
  leadId: string;
  companyId: string;
  leadNumber: string;
  name: string;
  phone: string;
  source: string;
  status: string;
  assignedToId?: string | null;
  branchId?: string | null;
  actorId?: string;
}

export interface LeadStatusChangedEventPayload {
  leadId: string;
  companyId: string;
  leadNumber: string;
  fromStatus: string;
  toStatus: string;
  reason?: string | null;
  actorId?: string;
}

export interface LeadAssignedEventPayload {
  leadId: string;
  companyId: string;
  leadNumber: string;
  previousAssignedToId?: string | null;
  newAssignedToId: string;
  branchId?: string | null;
  actorId?: string;
}
