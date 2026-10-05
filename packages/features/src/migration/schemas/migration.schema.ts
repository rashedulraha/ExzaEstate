import { z } from 'zod';

export const createBatchSchema = z.object({
  goLiveDate: z.string().min(1, 'Go-live date is required'),
  notes: z.string().optional(),
});

export type CreateBatchFormData = z.infer<typeof createBatchSchema>;

export const openingBalanceLineSchema = z.object({
  accountCode: z.string().min(1, 'Account code is required'),
  debitPaisa: z.string().regex(/^\d+$/, 'Debit amount must be valid paisa'),
  creditPaisa: z.string().regex(/^\d+$/, 'Credit amount must be valid paisa'),
  customerId: z.string().optional(),
  description: z.string().optional(),
});

export type OpeningBalanceLine = z.infer<typeof openingBalanceLineSchema>;

export const postOpeningBalanceSchema = z.object({
  postingDate: z.string().optional(),
  narration: z.string().optional(),
  lines: z.array(openingBalanceLineSchema).min(1, 'At least one balance line is required'),
});

export type PostOpeningBalanceFormData = z.infer<typeof postOpeningBalanceSchema>;

export const historicalPaymentSchema = z.object({
  date: z.string().min(1, 'Payment date is required'),
  amountPaisa: z.string().regex(/^\d+$/, 'Amount must be valid paisa'),
  method: z.string().min(1, 'Payment method is required'),
  receiptNumber: z.string().min(1, 'Old receipt number is required'),
});

export type HistoricalPaymentItem = z.infer<typeof historicalPaymentSchema>;

export const remainingInstallmentSchema = z.object({
  installmentNumber: z.number().int().positive(),
  dueDate: z.string().min(1, 'Due date is required'),
  amountPaisa: z.string().regex(/^\d+$/, 'Amount must be valid paisa'),
});

export type RemainingInstallmentItem = z.infer<typeof remainingInstallmentSchema>;

export const legacyBookingSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  propertyId: z.string().optional(),
  legacyBookingNo: z.string().min(1, 'Legacy booking number is required'),
  bookingDate: z.string().min(1, 'Booking date is required'),
  netPricePaisa: z.string().regex(/^\d+$/, 'Net price must be valid paisa'),
  totalPaidPaisa: z.string().regex(/^\d+$/, 'Total paid must be valid paisa'),
  historicalPayments: z.array(historicalPaymentSchema).optional(),
  remainingInstallments: z.array(remainingInstallmentSchema).optional(),
});

export type LegacyBookingFormData = z.infer<typeof legacyBookingSchema>;

export interface CustomerReconciliationDifference {
  customerId: string;
  customerName: string;
  openingArPaisa: string;
  legacyOutstandingPaisa: string;
  differencePaisa: string;
  isReconciled: boolean;
}

export interface ReconciliationGateResult {
  batchId: string;
  totalOpeningArPaisa: string;
  totalOpeningArFormatted: string;
  totalLegacyOutstandingPaisa: string;
  totalLegacyOutstandingFormatted: string;
  differencePaisa: string;
  differenceFormatted: string;
  canFinalize: boolean;
  customerDifferences: CustomerReconciliationDifference[];
}

export interface MigrationBatchItem {
  id: string;
  batchNumber: string;
  status: string;
  goLiveDate: string;
  notes?: string | null;
  openingJournalId?: string | null;
  finalizedAt?: string | null;
  finalizedById?: string | null;
  legacyBookingCount: number;
  createdAt: string;
}
