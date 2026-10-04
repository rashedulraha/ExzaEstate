import type { Account, Journal, JournalLine, JournalReversal } from '@prisma/client';
import type {
  JournalLineResponseDto,
  JournalResponseDto,
  JournalReversalResponseDto,
} from './dto/journal-response.dto.js';

export type JournalWithRelations = Journal & {
  lines?: Array<JournalLine & { account?: Pick<Account, 'code' | 'name'> }>;
  reversalRecord?: JournalReversal | null;
  reversals?: Journal[];
};

export function mapJournalLineToDto(
  line: JournalLine & { account?: Pick<Account, 'code' | 'name'> },
): JournalLineResponseDto {
  return {
    id: line.id,
    lineNumber: line.lineNumber,
    accountId: line.accountId,
    accountCode: line.account?.code ?? '',
    accountName: line.account?.name ?? '',
    debitPaisa: line.debitPaisa.toString(),
    creditPaisa: line.creditPaisa.toString(),
    description: line.description,
    partyType: line.partyType,
    partyId: line.partyId,
    costCenter: line.costCenter,
    projectId: line.projectId,
    createdAt: line.createdAt,
    updatedAt: line.updatedAt,
  };
}

export function mapReversalRecordToDto(rev: JournalReversal): JournalReversalResponseDto {
  return {
    id: rev.id,
    originalJournalId: rev.originalJournalId,
    reversalJournalId: rev.reversalJournalId,
    reason: rev.reason,
    reversedAt: rev.reversedAt,
    reversedById: rev.reversedById,
  };
}

export function mapJournalToDto(journal: JournalWithRelations): JournalResponseDto {
  const isReversed =
    Boolean(journal.reversalRecord !== null && journal.reversalRecord !== undefined) ||
    Boolean(journal.reversals && journal.reversals.length > 0);

  const effectiveStatus = isReversed && journal.status === 'Posted' ? 'Reversed' : journal.status;

  return {
    id: journal.id,
    journalNumber: journal.journalNumber,
    type: journal.type,
    status: effectiveStatus,
    postingDate: journal.postingDate.toISOString().slice(0, 10),
    periodId: journal.periodId,
    narration: journal.narration,
    reference: journal.reference,
    sourceModule: journal.sourceModule,
    totalAmount: journal.totalAmount.toString(),
    reversalOfId: journal.reversalOfId,
    isReversed,
    reversalRecord: journal.reversalRecord ? mapReversalRecordToDto(journal.reversalRecord) : null,
    postedAt: journal.postedAt,
    postedById: journal.postedById,
    lines: journal.lines ? journal.lines.map(mapJournalLineToDto) : undefined,
    createdAt: journal.createdAt,
    updatedAt: journal.updatedAt,
  };
}
