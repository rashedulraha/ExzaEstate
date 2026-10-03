export interface DefaultNumberingPatternDef {
  documentType: string;
  prefix: string;
  pattern: string;
  resetRule: 'NEVER' | 'YEARLY' | 'FISCAL_YEARLY';
}

export const DEFAULT_NUMBERING_PATTERNS: Record<string, DefaultNumberingPatternDef> = {
  RECEIPT: {
    documentType: 'RECEIPT',
    prefix: 'RCPT',
    pattern: 'RCPT-{BRANCH}-{YEAR}-{SEQ:6}',
    resetRule: 'YEARLY',
  },
  BOOKING: {
    documentType: 'BOOKING',
    prefix: 'BKG',
    pattern: 'BKG-{YEAR}-{SEQ:5}',
    resetRule: 'YEARLY',
  },
  CUSTOMER: {
    documentType: 'CUSTOMER',
    prefix: 'CUST',
    pattern: 'CUST-{SEQ:5}',
    resetRule: 'NEVER',
  },
  LEAD: {
    documentType: 'LEAD',
    prefix: 'LEAD',
    pattern: 'LEAD-{SEQ:5}',
    resetRule: 'NEVER',
  },
  QUOTATION: {
    documentType: 'QUOTATION',
    prefix: 'QUO',
    pattern: 'QUO-{BRANCH}-{YEAR}-{SEQ:5}',
    resetRule: 'YEARLY',
  },
  AGREEMENT: {
    documentType: 'AGREEMENT',
    prefix: 'AGR',
    pattern: 'AGR-{YEAR}-{SEQ:5}',
    resetRule: 'YEARLY',
  },
  PAYMENT: {
    documentType: 'PAYMENT',
    prefix: 'PMT',
    pattern: 'PMT-{BRANCH}-{YEAR}-{SEQ:6}',
    resetRule: 'YEARLY',
  },
  JOURNAL_VOUCHER: {
    documentType: 'JOURNAL_VOUCHER',
    prefix: 'JV',
    pattern: 'JV-{YEAR}-{SEQ:6}',
    resetRule: 'FISCAL_YEARLY',
  },
  EXPENSE_VOUCHER: {
    documentType: 'EXPENSE_VOUCHER',
    prefix: 'EXP',
    pattern: 'EXP-{BRANCH}-{YEAR}-{SEQ:6}',
    resetRule: 'FISCAL_YEARLY',
  },
  PURCHASE_ORDER: {
    documentType: 'PURCHASE_ORDER',
    prefix: 'PO',
    pattern: 'PO-{YEAR}-{SEQ:5}',
    resetRule: 'YEARLY',
  },
  VENDOR_BILL: {
    documentType: 'VENDOR_BILL',
    prefix: 'BILL',
    pattern: 'BILL-{YEAR}-{SEQ:5}',
    resetRule: 'YEARLY',
  },
  REFUND: {
    documentType: 'REFUND',
    prefix: 'RFD',
    pattern: 'RFD-{YEAR}-{SEQ:5}',
    resetRule: 'YEARLY',
  },
  COMMISSION_PAYMENT: {
    documentType: 'COMMISSION_PAYMENT',
    prefix: 'COM',
    pattern: 'COM-{YEAR}-{SEQ:5}',
    resetRule: 'YEARLY',
  },
};
