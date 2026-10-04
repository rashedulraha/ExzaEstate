import { Injectable, NotFoundException } from '@nestjs/common';
import { ERROR_CODES } from '@exzaestate/shared';
import { AppException } from '../../../common/exceptions/app.exception.js';
import { TenantDb } from '../../../database/tenant-db.service.js';
import { AuditService } from '../../../platform/audit/audit.service.js';
import { SequenceService } from '../../../platform/sequence/sequence.service.js';
import { PeriodGuard } from '../period/period-guard.service.js';
import { CreateJournalDto } from './dto/create-journal.dto.js';
import { QueryJournalDto } from './dto/query-journal.dto.js';
import { ReverseJournalDto } from './dto/reverse-journal.dto.js';
import { JournalResponseDto } from './dto/journal-response.dto.js';
import { mapJournalToDto } from './journal.mapper.js';
import { validateAccounts, validateJournalBalance } from './journal-validation.helper.js';
import { checkManualJournalApproval, generateJournalNumber } from './journal-approval.helper.js';
import { findJournalById, queryJournals } from './journal-query.helper.js';
import { executeJournalReversal } from './journal-reversal.helper.js';

@Injectable()
export class JournalService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly auditService: AuditService,
    private readonly sequenceService: SequenceService,
    private readonly periodGuard: PeriodGuard,
  ) {}

  async createDraft(
    companyId: string,
    userId: string,
    dto: CreateJournalDto,
  ): Promise<JournalResponseDto> {
    const { totalDebit, parsedLines } = validateJournalBalance(dto.lines);
    const postingDate = new Date(dto.postingDate);

    return this.tenantDb.withCompany(companyId, async (tx) => {
      const period = await this.periodGuard.assertOpen(companyId, postingDate, tx);
      await validateAccounts(
        companyId,
        dto.lines.map((l) => l.accountId),
        tx,
      );
      const journalNumber = await generateJournalNumber(tx, this.sequenceService, period.name);

      const journal = await tx.journal.create({
        data: {
          companyId,
          journalNumber,
          type: dto.type ?? 'GENERAL',
          status: 'Draft',
          postingDate,
          periodId: period.id,
          narration: dto.narration,
          reference: dto.reference,
          sourceModule: dto.sourceModule ?? 'MANUAL',
          totalAmount: totalDebit,
          createdById: userId,
          lines: {
            create: parsedLines.map((l) => ({
              companyId,
              lineNumber: l.lineNumber,
              accountId: l.accountId,
              debitPaisa: l.debitPaisa,
              creditPaisa: l.creditPaisa,
              description: l.description,
              partyType: l.partyType,
              partyId: l.partyId,
              costCenter: l.costCenter,
              projectId: l.projectId,
            })),
          },
        },
        include: {
          lines: { include: { account: { select: { code: true, name: true } } } },
          reversalRecord: true,
        },
      });

      await this.auditService.record(tx, {
        action: 'JOURNAL_CREATED',
        module: 'accounting',
        recordType: 'Journal',
        recordId: journal.id,
        after: { journalNumber, status: 'Draft', totalAmount: totalDebit.toString() },
      });

      return mapJournalToDto(journal);
    });
  }

  async createAndPost(
    companyId: string,
    userId: string,
    dto: CreateJournalDto,
    isManagingDirector = false,
  ): Promise<JournalResponseDto> {
    const { totalDebit, parsedLines } = validateJournalBalance(dto.lines);
    const postingDate = new Date(dto.postingDate);

    return this.tenantDb.withCompany(companyId, async (tx) => {
      await checkManualJournalApproval(
        tx,
        companyId,
        userId,
        isManagingDirector,
        totalDebit,
        dto.type,
      );

      const period = await this.periodGuard.assertOpen(companyId, postingDate, tx);
      await validateAccounts(
        companyId,
        dto.lines.map((l) => l.accountId),
        tx,
      );
      const journalNumber = await generateJournalNumber(tx, this.sequenceService, period.name);

      const draft = await tx.journal.create({
        data: {
          companyId,
          journalNumber,
          type: dto.type ?? 'GENERAL',
          status: 'Draft',
          postingDate,
          periodId: period.id,
          narration: dto.narration,
          reference: dto.reference,
          sourceModule: dto.sourceModule ?? 'MANUAL',
          totalAmount: totalDebit,
          createdById: userId,
          lines: {
            create: parsedLines.map((l) => ({
              companyId,
              lineNumber: l.lineNumber,
              accountId: l.accountId,
              debitPaisa: l.debitPaisa,
              creditPaisa: l.creditPaisa,
              description: l.description,
              partyType: l.partyType,
              partyId: l.partyId,
              costCenter: l.costCenter,
              projectId: l.projectId,
            })),
          },
        },
      });

      const journal = await tx.journal.update({
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

      await this.auditService.record(tx, {
        action: 'JOURNAL_POSTED',
        module: 'accounting',
        recordType: 'Journal',
        recordId: journal.id,
        after: { journalNumber, status: 'Posted', totalAmount: totalDebit.toString() },
      });

      return mapJournalToDto(journal);
    });
  }

  async postDraft(
    companyId: string,
    journalId: string,
    userId: string,
    isManagingDirector = false,
  ): Promise<JournalResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const journal = await tx.journal.findFirst({
        where: { id: journalId, companyId },
        include: { lines: true },
      });

      if (!journal) {
        throw new NotFoundException(`Journal with ID "${journalId}" not found`);
      }

      if (journal.status !== 'Draft' && journal.status !== 'Review') {
        throw new AppException(
          ERROR_CODES.INVALID_STATE_TRANSITION,
          `Cannot post journal in status "${journal.status}"`,
          { currentStatus: journal.status },
        );
      }

      await checkManualJournalApproval(
        tx,
        companyId,
        userId,
        isManagingDirector,
        journal.totalAmount,
        journal.type,
      );

      await this.periodGuard.assertOpen(companyId, journal.postingDate, tx);

      const posted = await tx.journal.update({
        where: { id: journal.id },
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

      await this.auditService.record(tx, {
        action: 'JOURNAL_POSTED',
        module: 'accounting',
        recordType: 'Journal',
        recordId: posted.id,
        after: { status: 'Posted', totalAmount: posted.totalAmount.toString() },
      });

      return mapJournalToDto(posted);
    });
  }

  async reverseAndCorrect(
    companyId: string,
    journalId: string,
    userId: string,
    dto: ReverseJournalDto,
  ): Promise<JournalResponseDto> {
    return this.tenantDb.withCompany(companyId, (tx) =>
      executeJournalReversal(
        tx,
        companyId,
        journalId,
        userId,
        dto,
        this.periodGuard,
        this.sequenceService,
        this.auditService,
      ),
    );
  }

  async getJournals(
    companyId: string,
    query: QueryJournalDto,
  ): Promise<{ data: JournalResponseDto[]; total: number; page: number; limit: number }> {
    return this.tenantDb.withCompany(companyId, (tx) => queryJournals(tx, companyId, query));
  }

  async getJournalById(companyId: string, id: string): Promise<JournalResponseDto> {
    return this.tenantDb.withCompany(companyId, (tx) => findJournalById(tx, companyId, id));
  }
}
