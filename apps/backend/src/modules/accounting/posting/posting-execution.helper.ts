import { HttpStatus } from '@nestjs/common';
import { ERROR_CODES } from '@exzaestate/shared';
import { AppException } from '../../../common/exceptions/app.exception.js';
import { TenantPrisma } from '../../../database/tenant-prisma.js';
import { AuditService } from '../../../platform/audit/audit.service.js';
import { SequenceService } from '../../../platform/sequence/sequence.service.js';
import { PeriodGuard } from '../period/period-guard.service.js';
import { generateJournalNumber } from '../journal/journal-approval.helper.js';
import { mapJournalToDto } from '../journal/journal.mapper.js';
import { JournalResponseDto } from '../journal/dto/journal-response.dto.js';
import { PostingJournalInstruction } from '../posting-rules/posting-rule.interface.js';

export async function validateAndResolveAccounts(
  tx: TenantPrisma,
  companyId: string,
  eventType: string,
  instructions: PostingJournalInstruction[],
): Promise<Map<string, { id: string; code: string; name: string }>> {
  const codesSet = new Set<string>();
  for (const inst of instructions) {
    for (const line of inst.lines) {
      codesSet.add(line.accountCode);
    }
  }

  const accountCodes = Array.from(codesSet);
  const accounts = await tx.account.findMany({
    where: {
      companyId,
      code: { in: accountCodes },
      isActive: true,
    },
    select: { id: true, code: true, name: true },
  });

  const accountMap = new Map(accounts.map((a) => [a.code, a]));

  for (const code of accountCodes) {
    if (!accountMap.has(code)) {
      throw new AppException(
        ERROR_CODES.POSTING_RULE_MISSING,
        `Required account code "${code}" for event "${eventType}" is missing or inactive in Chart of Accounts`,
        { eventType, missingAccountCode: code },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }

  return accountMap;
}

export function validateInstructionBalance(instruction: PostingJournalInstruction): bigint {
  let totalDebit = 0n;
  let totalCredit = 0n;

  for (const line of instruction.lines) {
    totalDebit += line.debitPaisa ?? 0n;
    totalCredit += line.creditPaisa ?? 0n;
  }

  if (totalDebit === 0n && totalCredit === 0n) {
    throw new AppException(
      ERROR_CODES.JOURNAL_UNBALANCED,
      'Posted journal must contain debit and credit lines with positive amounts (RULE-DOUBLE-ENTRY)',
      undefined,
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }

  if (totalDebit !== totalCredit) {
    throw new AppException(
      ERROR_CODES.JOURNAL_UNBALANCED,
      `Journal is unbalanced: total debits (${totalDebit}) must equal total credits (${totalCredit}) (RULE-DOUBLE-ENTRY)`,
      { totalDebit: totalDebit.toString(), totalCredit: totalCredit.toString() },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }

  return totalDebit;
}

export async function persistPostedJournal(
  tx: TenantPrisma,
  companyId: string,
  userId: string,
  eventType: string,
  instruction: PostingJournalInstruction,
  accountMap: Map<string, { id: string; code: string; name: string }>,
  periodGuard: PeriodGuard,
  sequenceService: SequenceService,
  auditService: AuditService,
  originalJournalId?: string,
  reversalReason?: string,
): Promise<JournalResponseDto> {
  const totalAmount = validateInstructionBalance(instruction);
  const period = await periodGuard.assertOpen(companyId, instruction.postingDate, tx);
  const journalNumber = await generateJournalNumber(tx, sequenceService, period.name);

  const isUuid = (val?: string) =>
    val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

  const draft = await tx.journal.create({
    data: {
      companyId,
      journalNumber,
      type: instruction.type ?? 'SYSTEM',
      status: 'Draft',
      postingDate: instruction.postingDate,
      periodId: period.id,
      narration: instruction.narration,
      reference: instruction.reference,
      sourceModule: instruction.sourceModule,
      sourceDocumentId: isUuid(instruction.sourceDocumentId)
        ? instruction.sourceDocumentId
        : undefined,
      sourceEventType: instruction.sourceEventType ?? eventType,
      totalAmount,
      createdById: userId,
      reversalOfId: isUuid(originalJournalId) ? originalJournalId : undefined,
      lines: {
        create: instruction.lines.map((l, index) => {
          const acc = accountMap.get(l.accountCode)!;
          return {
            companyId,
            lineNumber: index + 1,
            accountId: acc.id,
            debitPaisa: l.debitPaisa ?? 0n,
            creditPaisa: l.creditPaisa ?? 0n,
            description: l.description,
            partyType: l.partyType,
            partyId: l.partyId,
            costCenter: l.costCenter,
            projectId: l.projectId,
          };
        }),
      },
    },
  });

  const posted = await tx.journal.update({
    where: { id: draft.id },
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

  if (instruction.type === 'REVERSAL' && originalJournalId) {
    await tx.journalReversal.create({
      data: {
        companyId,
        originalJournalId,
        reversalJournalId: posted.id,
        reason: reversalReason ?? instruction.narration,
        reversedById: userId,
      },
    });
  }

  await auditService.record(tx, {
    action: 'JOURNAL_POSTED',
    module: 'accounting',
    recordType: 'Journal',
    recordId: posted.id,
    after: {
      journalNumber,
      status: 'Posted',
      totalAmount: totalAmount.toString(),
      sourceEventType: eventType,
      sourceDocumentId: instruction.sourceDocumentId,
    },
  });

  return mapJournalToDto(posted);
}
