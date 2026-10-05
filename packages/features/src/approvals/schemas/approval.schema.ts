import { z } from 'zod';

export const APPROVAL_STATUSES = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
  'EXPIRED',
] as const;
export type ApprovalStatusEnum = (typeof APPROVAL_STATUSES)[number];

export const APPROVAL_TYPES = [
  'DISCOUNT',
  'EXPENSE',
  'CANCELLATION',
  'WAIVER',
  'REFUND',
  'TRANSFER',
  'OTHER',
] as const;
export type ApprovalTypeEnum = (typeof APPROVAL_TYPES)[number];

export const approvalDecisionSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT', 'OVERRIDE'] as const),
  reason: z
    .string()
    .trim()
    .min(5, 'A clear business reason / justification is required (min 5 characters)'),
  notes: z.string().trim().optional(),
});

export type ApprovalDecisionInput = z.infer<typeof approvalDecisionSchema>;

export interface ApprovalItem {
  id: string;
  type: string;
  entityType: string;
  entityId: string;
  title: string;
  requesterId: string;
  requesterName?: string;
  amountPaisa?: string | null;
  percentage?: number | null;
  status: ApprovalStatusEnum;
  currentTier: number;
  maxTier: number;
  reason?: string | null;
  createdAt: string;
  updatedAt: string;
}
