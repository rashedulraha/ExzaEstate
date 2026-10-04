// Default Posting Rules (PRD MOD-EVENTS, accounting-rules.md §1-§3)

export interface DefaultPostingRuleDef {
  eventType: string;
  ruleName: string;
  description: string;
  debitAccountCode: string;
  creditAccountCode: string;
  accountMappings: Record<string, string>;
}

export const DEFAULT_POSTING_RULES: DefaultPostingRuleDef[] = [
  {
    eventType: 'BOOKING_CONFIRMED',
    ruleName: 'Booking Confirmation',
    description:
      'Creates receivable and revenue (or unearned revenue if ON_AGREEMENT/ON_HANDOVER) on booking confirmation',
    debitAccountCode: '1100',
    creditAccountCode: '4100',
    accountMappings: {
      receivable: '1100',
      revenue: '4100',
      unearnedRevenue: '2600',
      vat: '2400',
      discount: '5900',
    },
  },
  {
    eventType: 'PAYMENT_POSTED',
    ruleName: 'Payment Receipt Posted',
    description:
      'Posts received payment across cash/bank/wallet/cheque to receivable, advance, or suspense',
    debitAccountCode: '1010',
    creditAccountCode: '1100',
    accountMappings: {
      cash: '1010',
      bank: '1020',
      wallet: '1030',
      cheque: '1040',
      receivable: '1100',
      advances: '2200',
      suspense: '1900',
    },
  },
  {
    eventType: 'PAYMENT_REVERSED',
    ruleName: 'Payment Reversal',
    description: 'Reverses original payment journal entry with mirror debit/credit lines',
    debitAccountCode: '1100',
    creditAccountCode: '1010',
    accountMappings: {},
  },
  {
    eventType: 'CHEQUE_CLEARED',
    ruleName: 'Cheque Cleared',
    description: 'Moves uncleared cheque funds to destination bank account',
    debitAccountCode: '1020',
    creditAccountCode: '1040',
    accountMappings: {
      bank: '1020',
      cheque: '1040',
    },
  },
  {
    eventType: 'LATE_FEE_CHARGED',
    ruleName: 'Late Fee Charged',
    description: 'Charges late fee interest to customer receivable',
    debitAccountCode: '1100',
    creditAccountCode: '4200',
    accountMappings: {
      receivable: '1100',
      lateFeeIncome: '4200',
    },
  },
  {
    eventType: 'LATE_FEE_WAIVED',
    ruleName: 'Late Fee Waived',
    description: 'Waives previously charged late fee as a mirror reversal entry',
    debitAccountCode: '4200',
    creditAccountCode: '1100',
    accountMappings: {
      lateFeeIncome: '4200',
      receivable: '1100',
    },
  },
  {
    eventType: 'EXPENSE_APPROVED_PAID',
    ruleName: 'Expense Approved & Paid',
    description: 'Posts approved operational expense immediately or accrues to AP',
    debitAccountCode: '5500',
    creditAccountCode: '1010',
    accountMappings: {
      cash: '1010',
      bank: '1020',
      ap: '2100',
      defaultExpense: '5500',
    },
  },
  {
    eventType: 'VENDOR_BILL_POSTED',
    ruleName: 'Vendor Bill Posted',
    description: 'Accrues vendor bill to accounts payable',
    debitAccountCode: '1210',
    creditAccountCode: '2100',
    accountMappings: {
      wip: '1210',
      inventory: '1200',
      ap: '2100',
      defaultExpense: '5500',
    },
  },
  {
    eventType: 'VENDOR_PAYMENT',
    ruleName: 'Vendor Payment',
    description: 'Settles accounts payable via cash or bank',
    debitAccountCode: '2100',
    creditAccountCode: '1020',
    accountMappings: {
      ap: '2100',
      cash: '1010',
      bank: '1020',
    },
  },
  {
    eventType: 'BOOKING_CANCELLED',
    ruleName: 'Booking Cancelled',
    description:
      'Reverses sales revenue and settles customer payment to deduction income and refund payable',
    debitAccountCode: '4100',
    creditAccountCode: '1100',
    accountMappings: {
      revenue: '4100',
      unearnedRevenue: '2600',
      vat: '2400',
      receivable: '1100',
      deductionIncome: '4300',
      refundsPayable: '2500',
    },
  },
  {
    eventType: 'REFUND_PAID',
    ruleName: 'Refund Paid',
    description: 'Disburses approved refund from cash or bank',
    debitAccountCode: '2500',
    creditAccountCode: '1020',
    accountMappings: {
      refundsPayable: '2500',
      cash: '1010',
      bank: '1020',
    },
  },
  {
    eventType: 'COMMISSION_APPROVED',
    ruleName: 'Commission Approved',
    description: 'Accrues broker commission on approval',
    debitAccountCode: '5400',
    creditAccountCode: '2300',
    accountMappings: {
      commissionExpense: '5400',
      commissionPayable: '2300',
    },
  },
  {
    eventType: 'COMMISSION_PAID',
    ruleName: 'Commission Paid',
    description: 'Pays approved broker commission via cash or bank',
    debitAccountCode: '2300',
    creditAccountCode: '1020',
    accountMappings: {
      commissionPayable: '2300',
      cash: '1010',
      bank: '1020',
    },
  },
  {
    eventType: 'CASH_TRANSFER',
    ruleName: 'Cash / Bank Transfer',
    description: 'Internal contra transfer between cash and bank accounts',
    debitAccountCode: '1020',
    creditAccountCode: '1010',
    accountMappings: {
      cash: '1010',
      bank: '1020',
    },
  },
  {
    eventType: 'LAND_PURCHASE',
    ruleName: 'Land Purchase',
    description: 'Capitalizes land purchase into inventory',
    debitAccountCode: '1200',
    creditAccountCode: '1020',
    accountMappings: {
      landInventory: '1200',
      cash: '1010',
      bank: '1020',
      ap: '2100',
    },
  },
  {
    eventType: 'DEVELOPMENT_COST',
    ruleName: 'Development Cost',
    description: 'Capitalizes project development cost into WIP',
    debitAccountCode: '1210',
    creditAccountCode: '1020',
    accountMappings: {
      developmentWip: '1210',
      cash: '1010',
      bank: '1020',
      ap: '2100',
    },
  },
  {
    eventType: 'COST_OF_LAND_SOLD',
    ruleName: 'Cost of Land Sold',
    description: 'Moves WIP to Cost of Land Sold expense on handover completed',
    debitAccountCode: '5100',
    creditAccountCode: '1210',
    accountMappings: {
      costOfLandSold: '5100',
      developmentWip: '1210',
    },
  },
];
