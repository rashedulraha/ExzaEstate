export const EXPENSE_STATUS = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  VERIFIED: 'VERIFIED',
  APPROVED: 'APPROVED',
  PAID: 'PAID',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const;

export type ExpenseStatusEnum = (typeof EXPENSE_STATUS)[keyof typeof EXPENSE_STATUS];

export const EXPENSE_MD_THRESHOLD_PAISA = 50_000_000n; // ৳5,00,000

export const EXPENSE_PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'CHEQUE'] as const;
export type ExpensePaymentMethodEnum = (typeof EXPENSE_PAYMENT_METHODS)[number];

export interface ExpenseCategoryItem {
  id: string;
  code: string;
  name: string;
  accountCode: string;
  isActive: boolean;
  description?: string | null;
}

export interface ExpenseVoucherItem {
  id: string;
  voucherNumber: string;
  categoryId: string;
  categoryName?: string;
  projectId?: string | null;
  projectName?: string | null;
  costCenter?: string | null;
  payeeName: string;
  vendorId?: string | null;
  amountPaisa: string;
  description: string;
  status: ExpenseStatusEnum;
  expenseDate: string;
  paymentMethod?: ExpensePaymentMethodEnum | null;
  paidLater?: boolean;
  bankAccountId?: string | null;
  bankAccountCode?: string | null;
  createdById?: string;
  submittedAt?: string | null;
  verifiedAt?: string | null;
  approvedAt?: string | null;
  paidAt?: string | null;
  rejectionReason?: string | null;
}

export interface CreateExpenseInput {
  categoryId: string;
  projectId?: string;
  costCenter?: string;
  payeeName: string;
  vendorId?: string;
  amountPaisa: string;
  description: string;
  expenseDate?: string;
  paymentMethod?: ExpensePaymentMethodEnum;
  paidLater?: boolean;
  bankAccountId?: string;
  bankAccountCode?: string;
}

export interface PayExpenseInput {
  paymentMethod?: ExpensePaymentMethodEnum;
  bankAccountId?: string;
  bankAccountCode?: string;
  reference?: string;
}

export interface RejectExpenseInput {
  reason: string;
}
