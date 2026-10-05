import { z } from 'zod';

export const PAYMENT_METHODS = [
  'CASH',
  'BANK_TRANSFER',
  'CHEQUE',
  'BKASH',
  'NAGAD',
  'CARD',
  'GATEWAY',
  'OTHER',
] as const;

export type PaymentMethodEnum = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = ['DRAFT', 'RECEIVED', 'POSTED', 'CANCELLED', 'REVERSED'] as const;

export type PaymentStatusEnum = (typeof PAYMENT_STATUSES)[number];

export const CHEQUE_STATUSES = ['PENDING', 'CLEARED', 'BOUNCED'] as const;
export type ChequeStatusEnum = (typeof CHEQUE_STATUSES)[number];

export const INSTALLMENT_STATUSES = [
  'UNPAID',
  'PARTIALLY_PAID',
  'PAID',
  'WAIVED',
  'CANCELLED',
] as const;
export type InstallmentStatusEnum = (typeof INSTALLMENT_STATUSES)[number];

export const ALLOCATION_TARGETS = [
  'BOOKING_AMOUNT',
  'DOWNPAYMENT',
  'LATE_FEE',
  'INSTALLMENT',
  'CUSTOMER_ADVANCE',
] as const;
export type AllocationTargetEnum = (typeof ALLOCATION_TARGETS)[number];

// Payment Entry Form Schema
export const paymentEntrySchema = z
  .object({
    bookingId: z.string().min(1, 'Target booking is required'),
    customerId: z.string().min(1, 'Customer identifier is required'),
    amountPaisa: z
      .string()
      .min(1, 'Payment amount is required')
      .refine((v) => {
        const clean = v.replace(/\D/g, '');
        return clean.length > 0 && BigInt(clean) > 0n;
      }, 'Payment amount must be greater than zero'),
    paymentDate: z.string().min(1, 'Payment date is required'),
    paymentMethod: z.enum(PAYMENT_METHODS),
    referenceNotes: z.string().optional(),

    // Method-specific fields
    chequeNumber: z.string().optional(),
    chequeBank: z.string().optional(),
    chequeBranch: z.string().optional(),
    chequeDate: z.string().optional(),
    chequeDrawer: z.string().optional(),

    mobileTrxId: z.string().optional(),
    mobileSenderPhone: z.string().optional(),

    bankName: z.string().optional(),
    bankAccountRef: z.string().optional(),

    cardLast4: z.string().optional(),
    cardSlipRef: z.string().optional(),

    // Action mode: 'DRAFT' or 'POST'
    actionType: z.enum(['DRAFT', 'POST']).default('DRAFT'),
  })
  .superRefine((data, ctx) => {
    if (data.paymentMethod === 'CHEQUE') {
      if (!data.chequeNumber || !data.chequeNumber.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Cheque number is required for cheque payments',
          path: ['chequeNumber'],
        });
      }
      if (!data.chequeBank || !data.chequeBank.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Bank name is required for cheque payments',
          path: ['chequeBank'],
        });
      }
    }

    if (data.paymentMethod === 'BKASH' || data.paymentMethod === 'NAGAD') {
      if (!data.mobileTrxId || !data.mobileTrxId.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Transaction ID is required for mobile wallet payments',
          path: ['mobileTrxId'],
        });
      }
    }
  });

export type PaymentEntryInput = z.infer<typeof paymentEntrySchema>;

// Payment Reversal Schema (Step-up and justification)
export const paymentReversalSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
  reason: z.string().min(10, 'Reversal reason must be at least 10 characters'),
  stepUpPassword: z.string().min(1, 'Step-up password confirmation is required'),
});

export type PaymentReversalInput = z.infer<typeof paymentReversalSchema>;

// Cheque Action Schema (Clear / Bounce)
export const chequeActionSchema = z.object({
  chequeId: z.string().min(1, 'Cheque ID is required'),
  action: z.enum(['CLEAR', 'BOUNCE']),
  notes: z.string().optional(),
  bounceReason: z.string().optional(),
});

export type ChequeActionInput = z.infer<typeof chequeActionSchema>;

// Customer Statement Filter
export const customerStatementFilterSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  bookingId: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

export type CustomerStatementFilterInput = z.infer<typeof customerStatementFilterSchema>;

// Domain Entity Models
export interface PaymentItem {
  id: string;
  receiptNumber: string;
  bookingId: string;
  bookingCode?: string;
  customerId: string;
  customerName: string;
  propertyCode?: string;
  amountPaisa: string;
  paymentMethod: PaymentMethodEnum;
  paymentDate: string;
  status: PaymentStatusEnum;
  referenceNotes?: string;
  chequeNumber?: string;
  chequeBank?: string;
  chequeStatus?: ChequeStatusEnum;
  mobileTrxId?: string;
  previousDuePaisa?: string;
  currentDuePaisa?: string;
  collectedBy?: string;
  postedBy?: string;
  postedAt?: string;
  createdAt: string;
}

export interface InstallmentScheduleItem {
  id: string;
  bookingId: string;
  installmentNumber: number;
  name: string;
  dueDate: string;
  amountPaisa: string;
  paidPaisa: string;
  remainingPaisa: string;
  status: InstallmentStatusEnum;
  daysOverdue: number;
  lateFeePaisa?: string;
  waiverPaisa?: string;
}

export interface ChequeLedgerItem {
  id: string;
  paymentId: string;
  chequeNumber: string;
  bankName: string;
  branchName?: string;
  drawerName?: string;
  chequeDate: string;
  amountPaisa: string;
  status: ChequeStatusEnum;
  customerName: string;
  bookingCode?: string;
  bounceReason?: string;
  clearedAt?: string;
}

export interface StatementLineItem {
  id?: string;
  date: string;
  referenceNumber?: string;
  reference?: string;
  description: string;
  type?: string;
  debitPaisa: string; // Charges / Sale
  creditPaisa: string; // Payments
  runningBalancePaisa: string;
}

export interface AgingBucketItem {
  bucket: '1_7' | '8_30' | '31_60' | '61_90' | '90_PLUS';
  label: string;
  overduePaisa: string;
  count: number;
}

export interface PaymentFilters {
  search?: string;
  paymentMethod?: PaymentMethodEnum | 'ALL' | '';
  status?: PaymentStatusEnum | 'ALL' | '';
  bookingId?: string;
  customerId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
}

export interface PaymentKpis {
  totalCollectedPaisa: string;
  totalDraftPaisa: string;
  countPosted: number;
  countDraft: number;
  countReversed: number;
  countChequePending: number;
  totalRecords: number;
}

export interface TimingAndStatusChip {
  label: string;
  variant: 'success' | 'danger' | 'warning' | 'info' | 'void' | 'special' | 'neutral';
}

export interface CustomerStatementReport {
  customerId: string;
  customerName: string;
  customerPhone?: string | null;
  openingBalancePaisa?: string;
  totalDebitsPaisa?: string;
  totalCreditsPaisa?: string;
  closingOutstandingPaisa?: string;
  customerAdvancePaisa?: string;
  lines: StatementLineItem[];
}

export interface ArReconciliationReport {
  isReconciled: boolean;
  differencePaisa: string;
  statementOutstandingPaisa: string;
  arLedgerBalancePaisa: string;
}

export interface CustomerAgingRow {
  customerId: string;
  customerName: string;
  currentPaisa?: string;
  days1to7Paisa?: string;
  days8to30Paisa?: string;
  days31to60Paisa?: string;
  days61to90Paisa?: string;
  days90PlusPaisa?: string;
  totalPaisa?: string;
  formattedTotal?: string;
}
