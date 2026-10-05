import { z } from 'zod';

export const BOOKING_STATUS_LIST = [
  'REQUESTED',
  'PENDING_APPROVAL',
  'CONFIRMED',
  'AGREEMENT_PENDING',
  'AGREEMENT_COMPLETED',
  'COMPLETED',
  'CANCELLED',
  'EXPIRED',
  'TRANSFERRED',
] as const;

export type BookingStatusEnum = (typeof BOOKING_STATUS_LIST)[number];

export const bookingCoBuyerSchema = z.object({
  customerId: z.string().uuid('Valid customer ID required'),
  customerName: z.string().optional(),
  sharePercentage: z.number().min(0.01).max(99.99),
});

export const bookingWizardSchema = z.object({
  // Step 1: Property Selection
  propertyId: z.string().uuid('Please select an available property unit'),
  propertyCode: z.string().optional(),

  // Step 2: Customer & Joint Co-Buyers
  customerId: z.string().uuid('Primary customer is required'),
  customerName: z.string().optional(),
  coBuyers: z.array(bookingCoBuyerSchema),

  // Step 3: Pricing & Commercial Terms
  basePricePaisa: z.string().min(1, 'Base price required'),
  premiumAmountPaisa: z.string(),
  discountAmountPaisa: z.string(),
  discountPercentage: z.number().min(0).max(100),
  netPricePaisa: z.string().min(1, 'Net price required'),

  // Step 4: Payment Plan
  paymentPlanTemplateId: z.string().uuid().optional().or(z.literal('')),
  bookingAmountPaisa: z.string(),
  downPaymentPaisa: z.string(),
  reservationHoldHours: z.number().int().min(1).max(720),

  // Step 5: Nominee & Documentation
  nomineeName: z.string().trim().optional(),
  nomineeRelation: z.string().trim().optional(),
  nomineeNid: z.string().trim().optional(),
  notes: z.string().trim().optional(),

  // Step 6: Attribution
  salesExecutiveId: z.string().uuid().optional().or(z.literal('')),
  brokerId: z.string().uuid().optional().or(z.literal('')),
  leadId: z.string().uuid().optional().or(z.literal('')),
  quotationId: z.string().uuid().optional().or(z.literal('')),

  // Step 7: Review & Terms
  terms: z.string().trim().optional(),
  idempotencyKey: z.string().uuid().optional(),
});

export type BookingWizardInput = z.infer<typeof bookingWizardSchema>;

export interface BookingItem {
  id: string;
  bookingNumber: string;
  propertyId: string;
  propertyCode?: string | null;
  customerId: string;
  customerName?: string | null;
  status: BookingStatusEnum;
  basePricePaisa: string;
  totalPricePaisa: string;
  discountAmountPaisa: string;
  discountPercentage?: number | null;
  netPricePaisa: string;
  bookingAmountPaisa: string;
  downPaymentPaisa: string;
  totalPaidPaisa: string;
  approvalId?: string | null;
  approvalStatus?: string | null;
  reservationHoldHours?: number;
  bookingDate: string;
  expiresAt?: string | null;
  createdAt: string;
}
