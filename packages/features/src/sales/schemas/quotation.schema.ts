import { z } from 'zod';

export const QUOTATION_STATUSES = [
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'SENT',
  'ACCEPTED',
  'REJECTED',
  'EXPIRED',
  'CONVERTED',
] as const;

export type QuotationStatusEnum = (typeof QUOTATION_STATUSES)[number];

export const quotationFormSchema = z.object({
  propertyId: z.string().uuid('Please select a valid property unit'),
  customerId: z.string().uuid().optional().or(z.literal('')),
  leadId: z.string().uuid().optional().or(z.literal('')),
  validDays: z.number().int().min(1).max(90),
  basePricePaisa: z.string().min(1, 'Base price is required'),
  premiumAmountPaisa: z.string(),
  discountPct: z.number().min(0).max(100),
  discountAmountPaisa: z.string(),
  paymentPlanTemplateId: z.string().uuid().optional().or(z.literal('')),
  bookingAmountPaisa: z.string(),
  downPaymentPaisa: z.string(),
  installmentCount: z.number().int().min(1).max(120),
  frequency: z.enum(['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'CUSTOM']),
  notes: z.string().trim().optional(),
  terms: z.string().trim().optional(),
});

export type QuotationFormInput = z.infer<typeof quotationFormSchema>;

export interface QuotationItem {
  id: string;
  quotationNumber: string;
  status: QuotationStatusEnum;
  propertyId: string;
  propertyCode?: string;
  propertyName?: string;
  partyName?: string;
  partyType?: 'CUSTOMER' | 'LEAD';
  basePricePaisa: string;
  premiumAmountPaisa: string;
  discountAmountPaisa: string;
  discountPct?: number | null;
  netPricePaisa: string;
  validUntil: string;
  createdAt: string;
  notes?: string | null;
  terms?: string | null;
}
