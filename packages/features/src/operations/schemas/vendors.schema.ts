export interface VendorItem {
  id: string;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  tradeLicenseNo?: string | null;
  tin?: string | null;
  bin?: string | null;
  bankName?: string | null;
  bankBranch?: string | null;
  bankAccountNumber?: string | null;
  routingNumber?: string | null;
  isActive: boolean;
  totalBillsPaisa?: string;
  totalPaidPaisa?: string;
  outstandingBalancePaisa?: string;
}

export interface CreateVendorInput {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  tradeLicenseNo?: string;
  tin?: string;
  bin?: string;
  bankName?: string;
  bankBranch?: string;
  bankAccountNumber?: string;
  routingNumber?: string;
  isActive?: boolean;
}

export interface VendorBillLineInput {
  accountCode: string;
  description: string;
  amountPaisa: string;
  costCenter?: string;
  projectId?: string;
}

export interface CreateVendorBillInput {
  vendorId: string;
  projectId?: string;
  billDate?: string;
  dueDate?: string;
  taxWithholdingPaisa?: string;
  vatWithholdingPaisa?: string;
  notes?: string;
  postImmediately?: boolean;
  lines: VendorBillLineInput[];
}

export interface VendorBillItem {
  id: string;
  billNumber: string;
  vendorId: string;
  vendorName: string;
  projectId?: string | null;
  billDate: string;
  dueDate: string;
  subtotalPaisa: string;
  taxWithholdingPaisa: string;
  vatWithholdingPaisa: string;
  netPayablePaisa: string;
  status: 'DRAFT' | 'POSTED' | 'PAID' | 'CANCELLED';
  notes?: string | null;
  lines: VendorBillLineInput[];
}

export interface CreateVendorPaymentInput {
  vendorId: string;
  amountPaisa: string;
  paymentMethod?: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE';
  bankAccountId?: string;
  bankAccountCode?: string;
  paymentDate?: string;
  reference?: string;
  notes?: string;
  allocations?: Array<{ billId: string; amountPaisa: string }>;
}
