import type { LeadItem } from '../../packages/features/src/crm/hooks/useLeadList.js';
import type { QuotationItem } from '../../packages/features/src/sales/schemas/quotation.schema.js';
import type { BookingItem } from '../../packages/features/src/sales/schemas/booking.schema.js';
import type {
  PaymentItem,
  CustomerStatementReport,
  ArReconciliationReport,
  InstallmentScheduleItem,
} from '../../packages/features/src/collection/schemas/collection.schema.js';

export interface GoldenCustomer {
  id: string;
  code: string;
  name: string;
  fullName: string;
  phone: string;
  email: string;
  maskedNid: string;
}

export interface GoldenProperty {
  id: string;
  code: string;
  project: string;
  type: string;
  areaSqft: string;
  basePricePaisa: string;
  status: 'AVAILABLE' | 'RESERVED' | 'BOOKED' | 'SOLD';
}

export const GOLDEN_CUSTOMER: GoldenCustomer = {
  id: 'cust-golden-001',
  code: 'CUST-2026-0042',
  name: 'Rahim Ahmed',
  fullName: 'Rahim Ahmed',
  phone: '+8801711000042',
  email: 'rahim.ahmed@example.com',
  maskedNid: '•••• •••• ••0123',
};

export const GOLDEN_PROPERTY: GoldenProperty = {
  id: 'prop-golden-101',
  code: 'PLOT-A101',
  project: 'Green Valley Model Town',
  type: 'PLOT',
  areaSqft: '3600',
  basePricePaisa: '500000000', // BDT 50,00,000.00
  status: 'BOOKED',
};

export const GOLDEN_LEAD: LeadItem = {
  id: 'lead-golden-001',
  fullName: 'Rahim Ahmed',
  phone: '+8801711000042',
  email: 'rahim.ahmed@example.com',
  source: 'WALK_IN',
  status: 'QUALIFIED',
  preferredType: 'PLOT',
  budgetMinPaisa: '400000000',
  budgetMaxPaisa: '500000000', // BDT 50,00,000.00
  notes: '5 Katha corner plot facing south-east',
  assignedTo: { id: 'exec-1', fullName: 'Sales Executive', email: 'sales.exec@example.com' },
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-01T10:00:00.000Z',
};

export const GOLDEN_QUOTATION: QuotationItem = {
  id: 'quo-golden-001',
  quotationNumber: 'QUO-2026-0042',
  status: 'APPROVED',
  propertyId: GOLDEN_PROPERTY.id,
  propertyCode: GOLDEN_PROPERTY.code,
  propertyName: 'Green Valley Model Town - PLOT-A101',
  partyName: GOLDEN_CUSTOMER.name,
  partyType: 'CUSTOMER',
  basePricePaisa: '500000000',
  premiumAmountPaisa: '0',
  discountAmountPaisa: '25000000', // BDT 2,50,000.00 (5% MD Tier)
  discountPct: 5.0,
  netPricePaisa: '475000000', // BDT 47,50,000.00
  validUntil: '2026-12-31T00:00:00.000Z',
  createdAt: '2026-10-01T10:00:00.000Z',
};

export const GOLDEN_BOOKING: BookingItem = {
  id: 'bkg-golden-001',
  bookingNumber: 'BKG-2026-0042',
  propertyId: GOLDEN_PROPERTY.id,
  propertyCode: GOLDEN_PROPERTY.code,
  customerId: GOLDEN_CUSTOMER.id,
  customerName: GOLDEN_CUSTOMER.name,
  status: 'CONFIRMED',
  basePricePaisa: '500000000',
  totalPricePaisa: '500000000',
  discountAmountPaisa: '25000000',
  discountPercentage: 5.0,
  netPricePaisa: '475000000',
  bookingAmountPaisa: '47500000',
  downPaymentPaisa: '47500000',
  totalPaidPaisa: '83125000', // 4,75,000 downpayment + 3,56,250 installment #1
  bookingDate: '2026-10-02T10:00:00.000Z',
  createdAt: '2026-10-02T10:00:00.000Z',
};

export function generateInstallmentSchedule(): InstallmentScheduleItem[] {
  const schedule: InstallmentScheduleItem[] = [];
  const totalInstallmentBalance = 427500000n; // 4,75,00,000 - 47,50,000 downpayment
  const count = 12;
  const baseAmount = totalInstallmentBalance / BigInt(count); // 35625000n (BDT 3,56,250.00)

  for (let i = 1; i <= count; i++) {
    schedule.push({
      id: `inst-uuid-${i}`,
      bookingId: GOLDEN_BOOKING.id,
      installmentNumber: i,
      name: `Installment #${i}`,
      dueDate: `2027-${String(i).padStart(2, '0')}-10T00:00:00.000Z`,
      amountPaisa: baseAmount.toString(),
      paidPaisa: i === 1 ? baseAmount.toString() : '0',
      remainingPaisa: i === 1 ? '0' : baseAmount.toString(),
      status: i === 1 ? 'PAID' : 'UNPAID',
    } as InstallmentScheduleItem);
  }
  return schedule;
}

export const GOLDEN_PAYMENTS: PaymentItem[] = [
  {
    id: 'pay-golden-001',
    paymentNumber: 'PAY-2026-0041',
    receiptNumber: 'REC-2026-0041',
    bookingId: GOLDEN_BOOKING.id,
    bookingCode: GOLDEN_BOOKING.bookingNumber,
    customerId: GOLDEN_CUSTOMER.id,
    customerName: GOLDEN_CUSTOMER.name,
    propertyCode: GOLDEN_PROPERTY.code,
    amountPaisa: '47500000', // 10% minimum threshold confirmation (AT-12)
    paymentMethod: 'BANK_TRANSFER',
    paymentDate: '2026-10-02T10:00:00.000Z',
    status: 'POSTED',
    referenceNotes: '10% Downpayment on booking confirmation',
    createdAt: '2026-10-02T10:00:00.000Z',
  },
  {
    id: 'pay-golden-002',
    paymentNumber: 'PAY-2026-0042',
    receiptNumber: 'REC-2026-0042',
    bookingId: GOLDEN_BOOKING.id,
    bookingCode: GOLDEN_BOOKING.bookingNumber,
    customerId: GOLDEN_CUSTOMER.id,
    customerName: GOLDEN_CUSTOMER.name,
    propertyCode: GOLDEN_PROPERTY.code,
    amountPaisa: '35625000', // Installment #1 (RULE-INTEGER-PAISA)
    paymentMethod: 'CHEQUE',
    paymentDate: '2026-10-15T14:30:00.000Z',
    status: 'POSTED',
    referenceNotes: 'Installment #1 payment allocation',
    chequeNumber: 'CHQ-889922',
    createdAt: '2026-10-15T14:30:00.000Z',
  },
];

export const GOLDEN_STATEMENT: CustomerStatementReport = {
  customerId: GOLDEN_CUSTOMER.id,
  customerName: GOLDEN_CUSTOMER.name,
  customerPhone: GOLDEN_CUSTOMER.phone,
  openingBalancePaisa: '0',
  totalDebitsPaisa: '475000000', // BDT 47,50,000.00
  totalCreditsPaisa: '83125000', // BDT 8,31,250.00
  closingOutstandingPaisa: '391875000', // BDT 39,18,750.00
  customerAdvancePaisa: '0',
  lines: [
    {
      date: '2026-10-02T10:00:00.000Z',
      referenceNumber: 'BKG-2026-0042',
      description: 'Booking PLOT-A101 Confirmation',
      debitPaisa: '475000000',
      creditPaisa: '0',
      runningBalancePaisa: '475000000',
    },
    {
      date: '2026-10-02T10:15:00.000Z',
      referenceNumber: 'REC-2026-0041',
      description: 'Downpayment Received (Bank Transfer)',
      debitPaisa: '0',
      creditPaisa: '47500000',
      runningBalancePaisa: '427500000',
    },
    {
      date: '2026-10-15T14:30:00.000Z',
      referenceNumber: 'REC-2026-0042',
      description: 'Installment #1 Payment (Cheque)',
      debitPaisa: '0',
      creditPaisa: '35625000',
      runningBalancePaisa: '391875000',
    },
  ],
};

export const GOLDEN_RECONCILIATION: ArReconciliationReport = {
  isReconciled: true,
  differencePaisa: '0',
  statementOutstandingPaisa: '391875000',
  arLedgerBalancePaisa: '391875000',
};
