import { ValidationException } from '../../../common/exceptions/app.exception.js';

export interface NumberingPatternDef {
  documentType: string;
  prefix: string;
  pattern: string;
  resetRule: 'NEVER' | 'YEARLY' | 'FISCAL_YEARLY';
}

export const DEFAULT_NUMBERING_PATTERNS: Record<string, NumberingPatternDef> = {
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

export interface FormatTokens {
  prefix: string;
  branchCode?: string;
  projectCode?: string;
  year: string;
  twoDigitYear: string;
  sequence: bigint | number;
}

export function formatPattern(pattern: string, tokens: FormatTokens): string {
  let result = pattern;

  result = result.replace(/{PREFIX}/gi, tokens.prefix);

  if (tokens.branchCode) {
    result = result.replace(/{BRANCH}/gi, tokens.branchCode);
  }

  if (tokens.projectCode) {
    result = result.replace(/{PROJECT}/gi, tokens.projectCode);
  }

  result = result.replace(/{YEAR}/gi, tokens.year);
  result = result.replace(/{YY}/gi, tokens.twoDigitYear);

  result = result.replace(/{SEQ:(\d+)}/gi, (_match, paddingStr: string) => {
    const padding = parseInt(paddingStr, 10) || 5;
    return String(tokens.sequence).padStart(padding, '0');
  });

  result = result.replace(/{SEQUENCE}/gi, String(tokens.sequence).padStart(5, '0'));

  return result;
}

export function validatePatternTokens(pattern: string): void {
  if (!pattern.includes('{SEQ') && !pattern.includes('{SEQUENCE}')) {
    throw new ValidationException('Pattern must include a {SEQ:n} or {SEQUENCE} token');
  }
}

export function resolveFiscalYearString(
  date: Date,
  resetRule: 'NEVER' | 'YEARLY' | 'FISCAL_YEARLY',
  startMonth = 7,
): string {
  const calYear = String(date.getFullYear());
  if (resetRule === 'NEVER') {
    return 'ALL';
  }
  if (resetRule === 'YEARLY') {
    return calYear;
  }

  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  if (month >= startMonth) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
}

export function resolveScopeKey(pattern: string, branchCode?: string): string {
  if (pattern.includes('{BRANCH}') && branchCode) {
    return branchCode.toUpperCase();
  }
  return 'ALL';
}

export function resolveEffectiveConfig(
  defaultDef: NumberingPatternDef,
  record?: { prefix?: string | null; pattern?: string | null; resetRule?: string | null } | null,
) {
  return {
    prefix: record?.prefix ?? defaultDef.prefix,
    pattern: record?.pattern ?? defaultDef.pattern,
    resetRule: (record?.resetRule as NumberingPatternDef['resetRule']) ?? defaultDef.resetRule,
  };
}
