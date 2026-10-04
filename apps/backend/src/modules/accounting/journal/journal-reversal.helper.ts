import { NotFoundException } from '@nestjs/common';
import { ERROR_CODES } from '@exzaestate/shared';
import { AppException } from '../../../common/exceptions/app.exception.js';
import { TenantPrisma } from '../../../database/tenant-prisma.js';
import { AuditService } from '../../../platform/audit/audit.service.js';
import { SequenceService } from '../../../platform/sequence/sequence.service.js';
import { PeriodGuard } from '../period/period-guard.service.js';
import { ReverseJournalDto } from './dto/reverse-journal.dto.js';
import { JournalResponseDto } from './dto/journal-response.dto.js';
import { mapJournalToDto } from './journal.mapper.js';
import { generateJournalNumber } from './journal-approval.helper.js';

export async function executeJournalReversal(
  tx: TenantPrisma,
  companyId: string,
  journalId: string,
  userId: string,
  dto: ReverseJournalDto,
  periodGuard: PeriodGuard,
  sequenceService: SequenceService,
  auditService: AuditService,
): Promise<JournalResponseDto> {
  const original = await tx.journal.findFirst({
    where: { id: journalId, companyId },
    include: {
      lines: true,
      reversals: true,
    },
  });

  if (!original) {
    throw new NotFoundException(`Journal with ID "${journalId}" not found`);
  }

  if (original.status !== 'Posted') {
    throw new AppException(
      ERROR_CODES.INVALID_STATE_TRANSITION,
      `Cannot reverse a journal with status "${original.status}". Only Posted journals can be reversed.`,
      { currentStatus: original.status },
    );
  }

  if (original.reversals.length > 0) {
    throw new AppException(ERROR_CODES.CONFLICT, 'Journal is already reversed', {
      originalId: original.id,
    });
  }

  const today = new Date();
  const period = await periodGuard.assertOpen(companyId, today, tx);
  const reversalJournalNumber = await generateJournalNumber(tx, sequenceService, period.name);

  const draftReversal = await tx.journal.create({
    data: {
      companyId,
      journalNumber: reversalJournalNumber,
      type: 'REVERSAL',
      status: 'Draft',
      postingDate: today,
      periodId: period.id,
      narration: `Reversal of ${original.journalNumber}: ${dto.reason}`,
      reference: original.journalNumber,
      sourceModule: original.sourceModule,
      totalAmount: original.totalAmount,
      reversalOfId: original.id,
      createdById: userId,
      lines: {
        create: original.lines.map((l: (typeof original.lines)[number]) => ({
          companyId,
          lineNumber: l.lineNumber,
          accountId: l.accountId,
          debitPaisa: l.creditPaisa,
          creditPaisa: l.debitPaisa,
          description: `Reversal: ${l.description ?? ''}`.trim(),
          partyType: l.partyType,
          partyId: l.partyId,
          costCenter: l.costCenter,
          projectId: l.projectId,
        })),
      },
    },
  });

  const reversalJournal = await tx.journal.update({
    where: { id: draftReversal.id },
    data: {
      status: 'Posted',
      postedAt: new Date(),
      postedById: userId,
    },
    include: {
      lines: { include: { account: { select: { code: true, name: true } } } },
      reversalRecord: true,
    },
  });

  await tx.journalReversal.create({
    data: {
      companyId,
      originalJournalId: original.id,
      reversalJournalId: reversalJournal.id,
      reason: dto.reason,
      reversedById: userId,
    },
  });

  await auditService.record(tx, {
    action: 'JOURNAL_REVERSED',
    module: 'accounting',
    recordType: 'Journal',
    recordId: original.id,
    before: { status: original.status },
    after: {
      status: 'Reversed',
      reversalJournalId: reversalJournal.id,
      reversalJournalNumber,
    },
    reason: dto.reason,
  });

  return mapJournalToDto(reversalJournal);
}
