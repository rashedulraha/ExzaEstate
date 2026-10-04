import { Prisma } from '@prisma/client';
import { ACCOUNT_TYPES, formatMoney, type AccountType } from '@exzaestate/shared';
import type { QueryLedgerDto } from './dto/query-ledger.dto.js';
import type {
  LedgerAccountDto,
  LedgerLineDto,
  LedgerReportDto,
} from './dto/ledger-response.dto.js';

export function getNormalBalance(type: AccountType): 'DEBIT' | 'CREDIT' {
  if (type === ACCOUNT_TYPES.ASSET || type === ACCOUNT_TYPES.EXPENSE) {
    return 'DEBIT';
  }
  return 'CREDIT';
}

export function computeRunningBalance(
  prevBalance: bigint,
  debitPaisa: bigint,
  creditPaisa: bigint,
  normalBalance: 'DEBIT' | 'CREDIT',
): bigint {
  if (normalBalance === 'DEBIT') {
    return prevBalance + debitPaisa - creditPaisa;
  }
  return prevBalance + creditPaisa - debitPaisa;
}

export interface RawLedgerLine {
  id: string;
  journalId: string;
  debitPaisa: bigint;
  creditPaisa: bigint;
  description?: string | null;
  costCenter?: string | null;
  projectId?: string | null;
  partyType?: string | null;
  partyId?: string | null;
  createdAt: Date;
  journal: {
    journalNumber: string;
    postingDate: Date;
    narration: string;
  };
}

export function mapRawLineToLedgerDto(
  line: RawLedgerLine,
  runningBalancePaisa: bigint,
): LedgerLineDto {
  const entryDateStr = line.journal.postingDate.toISOString().split('T')[0] ?? '';
  return {
    id: line.id,
    journalId: line.journalId,
    journalNumber: line.journal.journalNumber,
    entryDate: entryDateStr,
    description: line.description || line.journal.narration || 'General Journal Entry',
    debitPaisa: line.debitPaisa.toString(),
    creditPaisa: line.creditPaisa.toString(),
    debitFormatted: formatMoney(line.debitPaisa),
    creditFormatted: formatMoney(line.creditPaisa),
    runningBalancePaisa: runningBalancePaisa.toString(),
    runningBalanceFormatted: formatMoney(runningBalancePaisa),
    costCenter: line.costCenter,
    costCenterId: null,
    projectId: line.projectId,
    partyType: line.partyType,
    partyId: line.partyId,
  };
}

export function mapAccountToLedgerAccountDto(account: {
  id: string;
  code: string;
  name: string;
  type: string;
}): LedgerAccountDto {
  const accType = account.type as AccountType;
  return {
    id: account.id,
    code: account.code,
    name: account.name,
    type: accType,
    normalBalance: getNormalBalance(accType),
  };
}

export function parseLedgerDates(query: QueryLedgerDto): {
  startDate?: Date;
  endDate?: Date;
} {
  let startDate: Date | undefined;
  let endDate: Date | undefined;
  if (query.startDate) {
    startDate = new Date(query.startDate);
  }
  if (query.endDate) {
    endDate = new Date(`${query.endDate}T23:59:59.999Z`);
  }
  return { startDate, endDate };
}

export function buildOpeningFilter(
  companyId: string,
  targetAccountId: string | undefined,
  costCenterId: string | undefined,
  projectId: string | undefined,
  startDate: Date,
): Prisma.JournalLineWhereInput {
  return {
    companyId,
    ...(targetAccountId ? { accountId: targetAccountId } : {}),
    ...(costCenterId ? { costCenter: costCenterId } : {}),
    ...(projectId ? { projectId } : {}),
    journal: {
      status: { in: ['Posted', 'Locked'] },
      postingDate: { lt: startDate },
    },
  };
}

export function buildPeriodFilter(
  companyId: string,
  targetAccountId: string | undefined,
  costCenterId: string | undefined,
  projectId: string | undefined,
  startDate: Date | undefined,
  endDate: Date | undefined,
): Prisma.JournalLineWhereInput {
  return {
    companyId,
    ...(targetAccountId ? { accountId: targetAccountId } : {}),
    ...(costCenterId ? { costCenter: costCenterId } : {}),
    ...(projectId ? { projectId } : {}),
    journal: {
      status: { in: ['Posted', 'Locked'] },
      ...(startDate || endDate
        ? {
            postingDate: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {}),
            },
          }
        : {}),
    },
  };
}

export function calculateOpeningBalance(
  lines: { debitPaisa: bigint; creditPaisa: bigint }[],
  normalBalance: 'DEBIT' | 'CREDIT',
): bigint {
  let openDebit = 0n;
  let openCredit = 0n;
  for (const l of lines) {
    openDebit += l.debitPaisa;
    openCredit += l.creditPaisa;
  }
  return normalBalance === 'DEBIT' ? openDebit - openCredit : openCredit - openDebit;
}

export function computePagination<T extends { id: string }>(
  rawLines: T[],
  limit: number,
): { hasMore: boolean; pageLines: T[]; nextCursor: string | null } {
  const hasMore = rawLines.length > limit;
  const pageLines = hasMore ? rawLines.slice(0, limit) : rawLines;
  const lastItem = pageLines[pageLines.length - 1];
  const nextCursor = hasMore && lastItem ? lastItem.id : null;
  return { hasMore, pageLines, nextCursor };
}

export function processLedgerLines(
  lines: RawLedgerLine[],
  initialBalance: bigint,
  normalBalance: 'DEBIT' | 'CREDIT',
): {
  mappedLines: LedgerLineDto[];
  totalDebitPaisa: bigint;
  totalCreditPaisa: bigint;
} {
  let currentBalance = initialBalance;
  let totalDebit = 0n;
  let totalCredit = 0n;

  const mappedLines = lines.map((line) => {
    totalDebit += line.debitPaisa;
    totalCredit += line.creditPaisa;
    currentBalance = computeRunningBalance(
      currentBalance,
      line.debitPaisa,
      line.creditPaisa,
      normalBalance,
    );
    return mapRawLineToLedgerDto(line, currentBalance);
  });

  return { mappedLines, totalDebitPaisa: totalDebit, totalCreditPaisa: totalCredit };
}

export function computeClosingBalance(
  openingBalance: bigint,
  totalDebit: bigint,
  totalCredit: bigint,
  normalBalance: 'DEBIT' | 'CREDIT',
): bigint {
  if (normalBalance === 'DEBIT') {
    return openingBalance + totalDebit - totalCredit;
  }
  return openingBalance + totalCredit - totalDebit;
}

export function buildLedgerReportDto(params: {
  account: { id: string; code: string; name: string; type: string } | null;
  openingBalance: bigint;
  totalDebit: bigint;
  totalCredit: bigint;
  closingBalance: bigint;
  mappedLines: LedgerLineDto[];
  nextCursor: string | null;
  hasMore: boolean;
}): LedgerReportDto {
  return {
    account: params.account ? mapAccountToLedgerAccountDto(params.account) : null,
    openingBalancePaisa: params.openingBalance.toString(),
    openingBalanceFormatted: formatMoney(params.openingBalance),
    totalDebitPaisa: params.totalDebit.toString(),
    totalDebitFormatted: formatMoney(params.totalDebit),
    totalCreditPaisa: params.totalCredit.toString(),
    totalCreditFormatted: formatMoney(params.totalCredit),
    closingBalancePaisa: params.closingBalance.toString(),
    closingBalanceFormatted: formatMoney(params.closingBalance),
    lines: params.mappedLines,
    nextCursor: params.nextCursor,
    hasMore: params.hasMore,
  };
}
