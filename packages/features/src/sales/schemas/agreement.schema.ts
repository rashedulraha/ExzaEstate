import { z } from 'zod';

export const AGREEMENT_STATUSES = [
  'AGREEMENT_PENDING',
  'AGREEMENT_COMPLETED',
  'CANCELLED',
] as const;
export type AgreementStatusEnum = (typeof AGREEMENT_STATUSES)[number];

export const generateAgreementSchema = z.object({
  bookingId: z.string().uuid('Booking ID is required'),
  templateId: z.string().uuid().optional().or(z.literal('')),
  title: z.string().trim().min(3, 'Title is required').default('Agreement for Sale & Allotment'),
  terms: z.string().trim().optional(),
  customContent: z.string().trim().optional(),
});

export type GenerateAgreementInput = z.infer<typeof generateAgreementSchema>;

export const signAndLockAgreementSchema = z.object({
  documentId: z.string().uuid().optional().or(z.literal('')),
  notes: z.string().trim().min(3, 'Execution remarks are required'),
});

export type SignAndLockAgreementInput = z.infer<typeof signAndLockAgreementSchema>;

export interface AgreementItem {
  id: string;
  agreementNumber: string;
  bookingId: string;
  bookingNumber?: string;
  customerName?: string;
  propertyCode?: string;
  title: string;
  status: AgreementStatusEnum;
  version: number;
  signedAt?: string | null;
  lockedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
