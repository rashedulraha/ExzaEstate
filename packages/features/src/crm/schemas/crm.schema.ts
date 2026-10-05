import { z } from 'zod';

export const LEAD_STATUSES = [
  'NEW',
  'CONTACTED',
  'INTERESTED',
  'QUALIFIED',
  'SITE_VISIT',
  'NEGOTIATION',
  'BOOKING',
  'CUSTOMER',
  'LOST',
] as const;
export type LeadStatusEnum = (typeof LEAD_STATUSES)[number];

export const LEAD_SOURCES = [
  'FACEBOOK',
  'GOOGLE',
  'NEWSPAPER',
  'BILLBOARD',
  'REFERRAL',
  'WALK_IN',
  'FAIR',
  'CALL_CENTER',
  'OTHER',
] as const;
export type LeadSourceEnum = (typeof LEAD_SOURCES)[number];

export const FOLLOW_UP_TYPES = ['CALL', 'MEETING', 'SITE_VISIT', 'EMAIL', 'WHATSAPP'] as const;
export type FollowUpTypeEnum = (typeof FOLLOW_UP_TYPES)[number];

export const createLeadSchema = z.object({
  fullName: z.string().trim().min(2, 'Name must be at least 2 characters').max(255),
  phone: z
    .string()
    .trim()
    .min(10, 'Valid phone number is required')
    .max(20, 'Phone cannot exceed 20 characters'),
  email: z.string().trim().email('Valid email address is required').optional().or(z.literal('')),
  source: z.enum(LEAD_SOURCES),
  status: z.enum(LEAD_STATUSES).optional(),
  preferredType: z.string().optional().or(z.literal('')),
  budgetMinPaisa: z
    .string()
    .trim()
    .refine((val) => val === '' || (!isNaN(Number(val)) && Number(val) >= 0), {
      message: 'Budget must be non-negative',
    })
    .optional()
    .or(z.literal('')),
  budgetMaxPaisa: z
    .string()
    .trim()
    .refine((val) => val === '' || (!isNaN(Number(val)) && Number(val) >= 0), {
      message: 'Budget must be non-negative',
    })
    .optional()
    .or(z.literal('')),
  assignedToId: z.string().uuid().optional().or(z.literal('')),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;

export const convertLeadSchema = z.object({
  leadId: z.string().uuid(),
  nid: z
    .string()
    .trim()
    .min(10, 'Bangladeshi NID must be 10, 13, or 17 digits')
    .max(17, 'NID cannot exceed 17 digits'),
  address: z.string().trim().min(5, 'Primary address is required'),
  occupation: z.string().trim().optional().or(z.literal('')),
});

export type ConvertLeadInput = z.infer<typeof convertLeadSchema>;

export const createFollowUpSchema = z.object({
  leadId: z.string().uuid(),
  scheduledAt: z.string().min(1, 'Scheduled date and time is required'),
  type: z.enum(FOLLOW_UP_TYPES),
  notes: z.string().trim().min(3, 'Follow-up notes required (min 3 chars)').max(500),
});

export type CreateFollowUpInput = z.infer<typeof createFollowUpSchema>;
