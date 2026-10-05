import { z } from 'zod';

export const ACCOUNT_TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'] as const;
export type AccountTypeEnum = (typeof ACCOUNT_TYPES)[number];

export const PARTY_TYPES = ['CUSTOMER', 'VENDOR', 'BROKER'] as const;
export type PartyTypeEnum = (typeof PARTY_TYPES)[number];

export const JOURNAL_TYPES = [
  'STANDARD',
  'PAYMENT',
  'RECEIPT',
  'ADJUSTMENT',
  'CLOSING',
  'REVERSAL',
] as const;
export type JournalTypeEnum = (typeof JOURNAL_TYPES)[number];

export const JOURNAL_STATUSES = ['DRAFT', 'REVIEW', 'POSTED', 'REVERSED', 'LOCKED'] as const;
export type JournalStatusEnum = (typeof JOURNAL_STATUSES)[number];

export const PERIOD_STATUSES = ['OPEN', 'CLOSED', 'LOCKED'] as const;
export type PeriodStatusEnum = (typeof PERIOD_STATUSES)[number];

// Account Form Schema
export const accountFormSchema = z.object({
  code: z
    .string()
    .min(3, 'Code must be at least 3 digits')
    .max(10, 'Code max 10 digits')
    .regex(/^\d+$/, 'Account code must be numeric digits'),
  name: z.string().min(2, 'Account title must be at least 2 characters'),
  type: z.enum(ACCOUNT_TYPES),
  parentId: z.string().optional(),
  isGroup: z.boolean().default(false),
  partyType: z.enum(PARTY_TYPES).optional(),
  description: z.string().optional(),
});
export type AccountFormInput = z.infer<typeof accountFormSchema>;

// Journal Line Schema
export const journalLineSchema = z.object({
  id: z.string().optional(),
  accountId: z.string().min(1, 'Target account is required'),
  accountCode: z.string().optional(),
  accountName: z.string().optional(),
  debitPaisa: z.string().default('0'),
  creditPaisa: z.string().default('0'),
  description: z.string().optional(),
  partyType: z.string().optional(),
  partyId: z.string().optional(),
  costCenter: z.string().optional(),
  projectId: z.string().optional(),
});
export type JournalLineInput = z.infer<typeof journalLineSchema>;

function validateSingleLine(
  line: z.infer<typeof journalLineSchema>,
  index: number,
  ctx: z.RefinementCtx,
): { debit: bigint; credit: bigint } {
  const d = BigInt(line.debitPaisa || '0');
  const c = BigInt(line.creditPaisa || '0');

  if (d === 0n && c === 0n) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Line must have either a debit or credit amount',
      path: ['lines', index, 'debitPaisa'],
    });
  }
  if (d > 0n && c > 0n) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Line cannot have both debit and credit amounts',
      path: ['lines', index, 'creditPaisa'],
    });
  }
  return { debit: d, credit: c };
}

// Journal Entry Form Schema
export const journalEntrySchema = z
  .object({
    postingDate: z.string().min(1, 'Posting date is required'),
    type: z.enum(JOURNAL_TYPES).default('STANDARD'),
    narration: z.string().min(3, 'Narration must be at least 3 characters'),
    reference: z.string().optional(),
    lines: z.array(journalLineSchema).min(2, 'A journal must contain at least 2 lines'),
    actionType: z.enum(['DRAFT', 'POST']).default('DRAFT'),
  })
  .superRefine((data, ctx) => {
    let totalDebit = 0n;
    let totalCredit = 0n;

    data.lines.forEach((line, i) => {
      const { debit, credit } = validateSingleLine(line, i, ctx);
      totalDebit += debit;
      totalCredit += credit;
    });

    if (data.actionType === 'POST' && totalDebit !== totalCredit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Double-entry requires Total Debits to equal Total Credits before posting',
        path: ['lines'],
      });
    }
  });

export type JournalEntryInput = z.infer<typeof journalEntrySchema>;

// Journal Reversal Schema
export const journalReversalSchema = z.object({
  journalId: z.string().min(1, 'Journal ID is required'),
  reason: z.string().min(10, 'Reversal reason must be at least 10 characters'),
  stepUpPassword: z.string().min(1, 'Step-up password confirmation is required'),
});
export type JournalReversalInput = z.infer<typeof journalReversalSchema>;

// Period Actions
export const periodActionSchema = z.object({
  periodId: z.string().min(1, 'Period ID is required'),
  action: z.enum(['CLOSE', 'REOPEN', 'LOCK']),
  reason: z.string().min(10, 'Business justification is required (minimum 10 characters)'),
  stepUpPassword: z.string().min(1, 'Step-up password confirmation is required'),
});
export type PeriodActionInput = z.infer<typeof periodActionSchema>;

// Cash / Bank Transfer Schema
export const cashTransferSchema = z
  .object({
    sourceBankAccountId: z.string().min(1, 'Source account is required'),
    destinationBankAccountId: z.string().min(1, 'Destination account is required'),
    amountPaisa: z.string().min(1, 'Transfer amount is required'),
    transferDate: z.string().min(1, 'Transfer date is required'),
    referenceNumber: z.string().optional(),
    narration: z.string().optional(),
  })
  .refine((d) => d.sourceBankAccountId !== d.destinationBankAccountId, {
    message: 'Destination account must be different from source account',
    path: ['destinationBankAccountId'],
  });
export type CashTransferInput = z.infer<typeof cashTransferSchema>;

// Domain Entity Models
export interface AccountTreeItem {
  id: string;
  code: string;
  name: string;
  type: AccountTypeEnum;
  parentId?: string | null;
  isGroup: boolean;
  system: boolean;
  partyType?: PartyTypeEnum | null;
  description?: string | null;
  balancePaisa: string;
  children?: AccountTreeItem[];
}

export interface JournalItem {
  id: string;
  journalNumber: string;
  postingDate: string;
  type: JournalTypeEnum;
  status: JournalStatusEnum;
  narration: string;
  reference?: string | null;
  sourceModule?: string | null;
  totalDebitPaisa: string;
  totalCreditPaisa: string;
  postedBy?: string | null;
  postedAt?: string | null;
  isReversed?: boolean;
  reversalOfId?: string | null;
  lines: JournalLineItem[];
}

export interface JournalLineItem {
  id: string;
  journalId?: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  debitPaisa: string;
  creditPaisa: string;
  description?: string | null;
  partyType?: string | null;
  partyName?: string | null;
  costCenter?: string | null;
  projectName?: string | null;
}

export interface LedgerEntryItem {
  id: string;
  postingDate: string;
  journalId: string;
  journalNumber: string;
  accountCode: string;
  accountName: string;
  narration: string;
  debitPaisa: string;
  creditPaisa: string;
  runningBalancePaisa: string;
  partyName?: string | null;
  costCenter?: string | null;
}

export interface TrialBalanceRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountTypeEnum;
  isGroup: boolean;
  level: number;
  openingDebitPaisa: string;
  openingCreditPaisa: string;
  periodDebitPaisa: string;
  periodCreditPaisa: string;
  closingDebitPaisa: string;
  closingCreditPaisa: string;
}

export interface FiscalPeriodItem {
  id: string;
  fiscalYearId: string;
  fiscalYearLabel: string;
  periodNumber: number;
  name: string;
  startDate: string;
  endDate: string;
  status: PeriodStatusEnum;
  closedAt?: string | null;
  closedBy?: string | null;
}

export interface CashBankAccountItem {
  id: string;
  accountName: string;
  accountType: 'CASH' | 'CURRENT' | 'SAVINGS' | 'MOBILE_WALLET' | 'OTHER';
  accountNumberMasked?: string | null;
  bankName?: string | null;
  branchName?: string | null;
  currentBalancePaisa: string;
  isReconciled: boolean;
}
