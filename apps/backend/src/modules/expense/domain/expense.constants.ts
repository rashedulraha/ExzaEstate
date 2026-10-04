export const EXPENSE_STATUS = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  VERIFIED: 'VERIFIED',
  PAID: 'PAID',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const;

export type ExpenseStatus = (typeof EXPENSE_STATUS)[keyof typeof EXPENSE_STATUS];

/** Default threshold above which MD approval is required (5,00,000 BDT = 50,000,000 paisa) */
export const DEFAULT_EXPENSE_MD_THRESHOLD_PAISA = 50_000_000n;

export const EXPENSE_PAYMENT_METHODS = {
  CASH: 'CASH',
  BANK_TRANSFER: 'BANK_TRANSFER',
  CHEQUE: 'CHEQUE',
} as const;

export type ExpensePaymentMethod =
  (typeof EXPENSE_PAYMENT_METHODS)[keyof typeof EXPENSE_PAYMENT_METHODS];
