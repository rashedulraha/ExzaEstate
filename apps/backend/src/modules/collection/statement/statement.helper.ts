import { formatMoney } from '@exzaestate/shared';
import type { Prisma } from '@prisma/client';
import type { StatementLineDto } from './dto/statement.dto.js';

export function buildDateFilter(
  fromDate?: string,
  toDate?: string,
): Prisma.DateTimeFilter | undefined {
  if (!fromDate && !toDate) return undefined;
  return {
    ...(fromDate ? { gte: new Date(fromDate) } : {}),
    ...(toDate ? { lte: new Date(toDate) } : {}),
  };
}

export interface JournalLineWithJournal {
  id: string;
  debitPaisa: bigint;
  creditPaisa: bigint;
  description: string | null;
  journal: {
    postingDate: Date;
    reference: string | null;
    journalNumber: string;
    narration: string;
    sourceEventType: string | null;
    type: string;
  };
}

export function computeStatementLines(
  lines: JournalLineWithJournal[],
  openingBalancePaisa: bigint,
): {
  statementLines: StatementLineDto[];
  totalDebits: bigint;
  totalCredits: bigint;
  closingOutstandingPaisa: bigint;
} {
  let running = openingBalancePaisa;
  let totalDebits = 0n;
  let totalCredits = 0n;

  const statementLines: StatementLineDto[] = lines.map((l) => {
    totalDebits += l.debitPaisa;
    totalCredits += l.creditPaisa;
    running = running + l.debitPaisa - l.creditPaisa;

    const dateStr = l.journal.postingDate.toISOString().split('T')[0] ?? '';
    return {
      date: dateStr,
      reference: l.journal.reference ?? l.journal.journalNumber,
      description: l.description ?? l.journal.narration,
      type: l.journal.sourceEventType ?? l.journal.type,
      debitPaisa: l.debitPaisa.toString(),
      creditPaisa: l.creditPaisa.toString(),
      runningBalancePaisa: running.toString(),
      formattedDebit: formatMoney(l.debitPaisa),
      formattedCredit: formatMoney(l.creditPaisa),
      formattedRunningBalance: formatMoney(running),
    };
  });

  return {
    statementLines,
    totalDebits,
    totalCredits,
    closingOutstandingPaisa: running,
  };
}

export function computeAdvanceBalance(
  advanceLines: { debitPaisa: bigint; creditPaisa: bigint }[],
): bigint {
  let advance = 0n;
  for (const al of advanceLines) {
    advance += al.creditPaisa - al.debitPaisa;
  }
  return advance < 0n ? 0n : advance;
}
