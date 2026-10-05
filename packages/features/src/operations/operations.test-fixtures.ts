import type {
  ExpenseVoucherItem,
  ExpenseCategoryItem,
  VendorItem,
  VendorBillItem,
  BrokerItem,
  CommissionRuleItem,
  CommissionPayableItem,
  BudgetItem,
  ProjectProfitabilityItem,
} from './schemas/operations.schema.js';
import type {
  BookingOption,
  CustomerOption,
} from './components/transfers/BookingTransferWizard.js';

export const testExpenseCategories: ExpenseCategoryItem[] = [
  {
    id: 'cat-1',
    code: 'EXP-OFFICE',
    name: 'Office Administrative & Supplies',
    accountCode: '5201',
    isActive: true,
  },
  {
    id: 'cat-2',
    code: 'EXP-SITE',
    name: 'Construction Site Operations',
    accountCode: '5102',
    isActive: true,
  },
];

export const testVouchers: ExpenseVoucherItem[] = [
  {
    id: 'vch-1',
    voucherNumber: 'EXP-2026-0001',
    categoryId: 'cat-1',
    categoryName: 'Office Administrative & Supplies',
    payeeName: 'Dhaka Stationery World',
    amountPaisa: '1500000', // ৳15,000 (≤ ৳5,00,000 GM threshold)
    description: 'Quarterly office supplies and stationery',
    status: 'SUBMITTED',
    expenseDate: '2026-10-01',
  },
  {
    id: 'vch-2',
    voucherNumber: 'EXP-2026-0002',
    categoryId: 'cat-2',
    categoryName: 'Construction Site Operations',
    payeeName: 'Bashundhara Heavy Machinery',
    amountPaisa: '75000000', // ৳7,50,000 (> ৳5,00,000 MD threshold)
    description: 'Excavator lease and site diesel procurement',
    status: 'APPROVED',
    expenseDate: '2026-10-02',
  },
  {
    id: 'vch-3',
    voucherNumber: 'EXP-2026-0003',
    categoryId: 'cat-1',
    categoryName: 'Office Administrative & Supplies',
    payeeName: 'National Electric Supply',
    amountPaisa: '5000000', // ৳50,000
    description: 'Site generator setup',
    status: 'DRAFT',
    expenseDate: '2026-10-03',
  },
];

export const testVendors: VendorItem[] = [
  {
    id: 'vnd-1',
    name: 'Meghna Cement Mills Ltd.',
    contactPerson: 'Md. Rafiqul Islam',
    phone: '01711223344',
    email: 'sales@meghnacement.com',
    tin: '123456789012',
    tradeLicenseNo: 'TRAD-DNCC-9921',
    isActive: true,
    totalBillsPaisa: '500000000', // ৳50,00,000
    totalPaidPaisa: '350000000', // ৳35,00,000
    outstandingBalancePaisa: '150000000', // ৳15,00,000
  },
  {
    id: 'vnd-2',
    name: 'BSRM Steels Limited',
    contactPerson: 'Engr. Tareq Ahmed',
    phone: '01811556677',
    email: 'tareq@bsrm.com',
    tin: '987654321098',
    isActive: true,
    totalBillsPaisa: '1200000000',
    totalPaidPaisa: '1200000000',
    outstandingBalancePaisa: '0',
  },
];

export const testVendorBills: VendorBillItem[] = [
  {
    id: 'bill-1',
    billNumber: 'BILL-2026-001',
    vendorId: 'vnd-1',
    vendorName: 'Meghna Cement Mills Ltd.',
    billDate: '2026-09-15',
    dueDate: '2026-10-15',
    subtotalPaisa: '100000000', // ৳10,00,000
    taxWithholdingPaisa: '5000000', // ৳50,000 TDS (5%)
    vatWithholdingPaisa: '7500000', // ৳75,000 VDS (7.5%)
    netPayablePaisa: '87500000', // ৳8,75,000
    status: 'DRAFT',
    lines: [
      {
        accountCode: '5101',
        description: '1000 Bags Portland Composite Cement',
        amountPaisa: '100000000',
      },
    ],
  },
];

export const testBrokers: BrokerItem[] = [
  {
    id: 'brk-1',
    name: 'Kamal Hossain Real Estate',
    phone: '01799887766',
    email: 'kamal@brokerage.bd',
    nid: '19852691234567890',
    tin: '456789123012',
    isActive: true,
    totalCommissionEarnedPaisa: '60000000', // ৳6,00,000
    totalCommissionPaidPaisa: '40000000', // ৳4,00,000
    outstandingCommissionPaisa: '20000000', // ৳2,00,000
  },
];

export const testCommissionRules: CommissionRuleItem[] = [
  {
    id: 'rule-1',
    name: 'Standard 2% on Confirmation',
    calculationType: 'PERCENT_NET_PRICE',
    percentage: 2.0,
    triggerEvent: 'ON_CONFIRMED',
    isActive: true,
  },
];

export const testCommissionPayables: CommissionPayableItem[] = [
  {
    id: 'comm-1',
    brokerId: 'brk-1',
    brokerName: 'Kamal Hossain Real Estate',
    bookingId: 'bk-101',
    bookingNumber: 'BKG-2026-0101',
    customerName: 'Tanvir Chowdhury',
    propertyName: 'Meridian Heights - Unit 7B',
    amountPaisa: '20000000', // ৳2,00,000
    status: 'EARNED',
    earnedAt: '2026-09-20',
  },
  {
    id: 'comm-2',
    brokerId: 'brk-1',
    brokerName: 'Kamal Hossain Real Estate',
    bookingId: 'bk-102',
    bookingNumber: 'BKG-2026-0099',
    customerName: 'Farhana Sultana',
    propertyName: 'Meridian Vista - Unit 4A',
    amountPaisa: '5000000', // ৳50,000
    status: 'REVERSED',
    earnedAt: '2026-08-10',
    isClawback: true,
  },
];

export const testBudgets: BudgetItem[] = [
  {
    id: 'bg-1',
    projectName: 'Meridian Heights',
    categoryName: 'Foundation & Civil Structure',
    fiscalYear: '2026-2027',
    budgetAmountPaisa: '1000000000', // ৳1,00,00,000
    actualSpendPaisa: '650000000', // ৳65,00,000 (65%)
    spendPercentage: 65,
    alertLevel: 'NORMAL',
  },
  {
    id: 'bg-2',
    projectName: 'Meridian Heights',
    categoryName: 'Electrical & MEP Fitting',
    fiscalYear: '2026-2027',
    budgetAmountPaisa: '500000000', // ৳50,00,000
    actualSpendPaisa: '375000000', // ৳37,50,000 (75%)
    spendPercentage: 75,
    alertLevel: 'INFO',
  },
  {
    id: 'bg-3',
    projectName: 'Meridian Vista',
    categoryName: 'Interior Finishes',
    fiscalYear: '2026-2027',
    budgetAmountPaisa: '200000000', // ৳20,00,000
    actualSpendPaisa: '176000000', // ৳17,60,000 (88%)
    spendPercentage: 88,
    alertLevel: 'WARNING',
  },
  {
    id: 'bg-4',
    projectName: 'Meridian Bay',
    categoryName: 'HVAC & Elevators',
    fiscalYear: '2026-2027',
    budgetAmountPaisa: '300000000', // ৳30,00,000
    actualSpendPaisa: '330000000', // ৳33,00,000 (110%)
    spendPercentage: 110,
    alertLevel: 'CRITICAL',
  },
];

export const testBookingOptions: BookingOption[] = [
  {
    id: 'bk-orig-1',
    bookingNumber: 'BKG-2026-8801',
    customerName: 'Anisur Rahman',
    customerId: 'cust-1',
    propertyName: 'Meridian Sky Tower - 12A',
    totalPricePaisa: '1850000000', // ৳1,85,00,000
    paidAmountPaisa: '450000000', // ৳45,00,000
  },
];

export const testCustomerOptions: CustomerOption[] = [
  {
    id: 'cust-1',
    name: 'Anisur Rahman',
    phone: '01711001122',
  },
  {
    id: 'cust-2',
    name: 'Mustafizur Rahman',
    phone: '01811334455',
    email: 'mustafiz@domain.bd',
  },
];

export const testProfitability: ProjectProfitabilityItem = {
  projectId: 'prj-101',
  projectCode: 'PRJ-MH',
  projectName: 'Meridian Heights Luxury Living',
  totalRevenuePaisa: '4500000000', // ৳45,00,00000
  totalCostPaisa: '3150000000', // ৳31,50,00000
  netProfitPaisa: '1350000000', // ৳13,50,00000
  profitMarginPercent: 30.0,
  isProfitable: true,
  costBreakdown: {
    landCostPaisa: '1200000000',
    developmentCostPaisa: '1400000000',
    marketingCostPaisa: '250000000',
    adminCostPaisa: '180000000',
    otherCostPaisa: '120000000',
    totalCostPaisa: '3150000000',
  },
};
