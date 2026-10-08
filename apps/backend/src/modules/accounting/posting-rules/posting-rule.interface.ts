export interface PostingLineInstruction {
  accountCode: string; // e.g. '1100'
  debitPaisa?: bigint;
  creditPaisa?: bigint;
  description?: string;
  partyType?: 'CUSTOMER' | 'VENDOR' | 'BROKER';
  partyId?: string;
  costCenter?: string;
  projectId?: string;
}

export interface PostingJournalInstruction {
  narration: string;
  reference?: string;
  sourceModule?: string;
  sourceDocumentId?: string;
  sourceEventType?: string;
  postingDate: Date;
  lines: PostingLineInstruction[];
  type?: 'GENERAL' | 'SYSTEM' | 'REVERSAL' | 'OPENING';
}

export interface PostingRuleRecord {
  id: string;
  companyId: string;
  eventType: string;
  ruleName: string;
  description: string | null;
  debitAccountCode: string | null;
  creditAccountCode: string | null;
  accountMappings: Record<string, string>;
  isActive: boolean;
}

export interface AccountingSettings {
  revenue_recognition?: 'ON_BOOKING' | 'ON_AGREEMENT' | 'ON_HANDOVER';
  vat_rate?: number;
  cancellation_deduction_rate?: number;
  late_fee_rate?: number;
  allow_suspense_receipts?: boolean;
  show_discount_gross?: boolean;
}

export interface PostingRuleHandler<TPayload = unknown> {
  readonly eventType: string;
  buildInstructions(
    payload: TPayload,
    rule: PostingRuleRecord,
    settings: AccountingSettings,
  ): Promise<PostingJournalInstruction[]> | PostingJournalInstruction[];
}

// Event Payload Interfaces

export interface BookingConfirmedPayload {
  bookingId: string;
  bookingNumber: string;
  customerId: string;
  projectId?: string;
  netPricePaisa: bigint | string | number;
  listPricePaisa?: bigint | string | number;
  discountPaisa?: bigint | string | number;
  vatPaisa?: bigint | string | number;
  postingDate: Date | string;
  reference?: string;
}

export interface PaymentPostedPayload {
  paymentId: string;
  paymentNumber?: string;
  customerId: string;
  amountPaisa: bigint | string | number;
  allocatedPaisa: bigint | string | number;
  overpaymentPaisa?: bigint | string | number;
  unallocatedPaisa?: bigint | string | number;
  paymentMethod:
    | 'CASH'
    | 'BANK_TRANSFER'
    | 'CARD'
    | 'GATEWAY'
    | 'CHEQUE'
    | 'MOBILE_WALLET'
    | 'OTHER';
  bankAccountCode?: string;
  postingDate: Date | string;
  reference?: string;
  projectId?: string;
}

export interface PaymentReversedPayload {
  originalJournalId: string;
  paymentId: string;
  reason: string;
  postingDate: Date | string;
  reference?: string;
}

export interface ChequeClearedPayload {
  chequeId: string;
  bankAccountCode?: string;
  amountPaisa: bigint | string | number;
  postingDate: Date | string;
  reference?: string;
}

export interface LateFeeChargedPayload {
  customerId: string;
  feePaisa: bigint | string | number;
  postingDate: Date | string;
  reference?: string;
  description?: string;
  projectId?: string;
}

export interface LateFeeWaivedPayload {
  customerId: string;
  feePaisa: bigint | string | number;
  postingDate: Date | string;
  reference?: string;
  reason?: string;
  projectId?: string;
}

export interface InstallmentWaivedPayload {
  installmentId: string;
  bookingId: string;
  customerId: string;
  amountPaisa: bigint | string | number;
  postingDate: Date | string;
  reference?: string;
  reason?: string;
  projectId?: string;
}

export interface BookingCancelledPayload {
  bookingId: string;
  bookingNumber: string;
  customerId: string;
  netPricePaisa: bigint | string | number;
  vatPaisa?: bigint | string | number;
  paidAmountPaisa: bigint | string | number;
  deductionPaisa: bigint | string | number;
  refundPaisa: bigint | string | number;
  postingDate: Date | string;
  reference?: string;
  projectId?: string;
}

export interface RefundPaidPayload {
  refundId: string;
  customerId: string;
  refundPaisa: bigint | string | number;
  paymentMethod?: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'MOBILE_WALLET';
  bankAccountCode?: string;
  postingDate: Date | string;
  reference?: string;
}

export interface CommissionApprovedPayload {
  brokerId: string;
  amountPaisa: bigint | string | number;
  postingDate: Date | string;
  reference?: string;
  projectId?: string;
}

export interface CommissionPaidPayload {
  brokerId: string;
  amountPaisa: bigint | string | number;
  paymentMethod?: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE';
  bankAccountCode?: string;
  postingDate: Date | string;
  reference?: string;
}

export interface CashTransferPayload {
  amountPaisa: bigint | string | number;
  sourceAccountCode: string;
  destinationAccountCode: string;
  postingDate: Date | string;
  reference?: string;
  narration?: string;
}

export interface ExpenseApprovedPaidPayload {
  expenseId: string;
  amountPaisa: bigint | string | number;
  expenseAccountCode?: string;
  paidLater?: boolean;
  paymentMethod?: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE';
  bankAccountCode?: string;
  vendorId?: string;
  costCenter?: string;
  projectId?: string;
  postingDate: Date | string;
  reference?: string;
  description?: string;
}

export interface VendorBillPostedPayload {
  billId: string;
  vendorId: string;
  amountPaisa: bigint | string | number;
  debitAccountCode?: string; // 1210 WIP, 1200 Inventory, or 5xxx Expense
  costCenter?: string;
  projectId?: string;
  postingDate: Date | string;
  reference?: string;
  description?: string;
}

export interface VendorPaymentPayload {
  paymentId: string;
  vendorId: string;
  amountPaisa: bigint | string | number;
  paymentMethod?: 'CASH' | 'BANK_TRANSFER';
  bankAccountCode?: string;
  postingDate: Date | string;
  reference?: string;
}

export interface LandPurchasePayload {
  amountPaisa: bigint | string | number;
  paymentMethod?: 'CASH' | 'BANK_TRANSFER' | 'CREDIT';
  bankAccountCode?: string;
  vendorId?: string;
  postingDate: Date | string;
  reference?: string;
  description?: string;
}

export interface DevelopmentCostPayload {
  amountPaisa: bigint | string | number;
  paymentMethod?: 'CASH' | 'BANK_TRANSFER' | 'CREDIT';
  bankAccountCode?: string;
  vendorId?: string;
  costCenter?: string;
  projectId?: string;
  postingDate: Date | string;
  reference?: string;
  description?: string;
}

export interface CostOfLandSoldPayload {
  amountPaisa: bigint | string | number;
  costCenter?: string;
  projectId?: string;
  postingDate: Date | string;
  reference?: string;
  description?: string;
}
