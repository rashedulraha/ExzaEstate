import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { ERROR_CODES } from '@exzaestate/shared';
import { AppException } from '../../../common/exceptions/app.exception.js';
import { TenantDb } from '../../../database/tenant-db.service.js';
import { TenantPrisma } from '../../../database/tenant-prisma.js';
import { AuditService } from '../../../platform/audit/audit.service.js';
import { SequenceService } from '../../../platform/sequence/sequence.service.js';
import { PeriodGuard } from '../period/period-guard.service.js';
import { JournalResponseDto } from '../journal/dto/journal-response.dto.js';
import { PostingRuleRegistry } from '../posting-rules/posting-rule.registry.js';
import { AccountingSettings, PostingRuleRecord } from '../posting-rules/posting-rule.interface.js';
import { persistPostedJournal, validateAndResolveAccounts } from './posting-execution.helper.js';

@Injectable()
export class PostingService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly registry: PostingRuleRegistry,
    private readonly periodGuard: PeriodGuard,
    private readonly sequenceService: SequenceService,
    private readonly auditService: AuditService,
  ) {}

  async post<T = unknown>(
    companyId: string,
    userId: string,
    eventType: string,
    payload: T,
    tx?: TenantPrisma,
  ): Promise<JournalResponseDto[]> {
    if (tx) {
      return this.executePosting(tx, companyId, userId, eventType, payload);
    }

    return this.tenantDb.withCompany(companyId, async (tenantTx) =>
      this.executePosting(tenantTx, companyId, userId, eventType, payload),
    );
  }

  private async executePosting<T = unknown>(
    tx: TenantPrisma,
    companyId: string,
    userId: string,
    eventType: string,
    payload: T,
  ): Promise<JournalResponseDto[]> {
    const handler = this.registry.getHandler(eventType);
    if (!handler) {
      throw new AppException(
        ERROR_CODES.POSTING_RULE_MISSING,
        `No posting rule handler registered for event "${eventType}"`,
        { eventType },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const ruleRecord = await tx.postingRule.findUnique({
      where: {
        companyId_eventType: {
          companyId,
          eventType,
        },
      },
    });

    if (!ruleRecord || !ruleRecord.isActive) {
      throw new AppException(
        ERROR_CODES.POSTING_RULE_MISSING,
        `No active posting rule found for event "${eventType}"`,
        { eventType },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const settings = await this.loadCompanySettings(tx, companyId);
    const enrichedPayload = await this.enrichPayloadIfReversal(tx, companyId, eventType, payload);

    const rule: PostingRuleRecord = {
      id: ruleRecord.id,
      companyId: ruleRecord.companyId,
      eventType: ruleRecord.eventType,
      ruleName: ruleRecord.ruleName,
      description: ruleRecord.description,
      debitAccountCode: ruleRecord.debitAccountCode,
      creditAccountCode: ruleRecord.creditAccountCode,
      accountMappings: (ruleRecord.accountMappings as Record<string, string>) ?? {},
      isActive: ruleRecord.isActive,
    };

    const instructions = await handler.buildInstructions(enrichedPayload, rule, settings);

    const instructionList = Array.isArray(instructions) ? instructions : [instructions];
    const accountMap = await validateAndResolveAccounts(tx, companyId, eventType, instructionList);

    const postedJournals: JournalResponseDto[] = [];
    const origId = (enrichedPayload as { originalJournalId?: string })?.originalJournalId;
    const revReason = (enrichedPayload as { reason?: string })?.reason;

    for (const instruction of instructionList) {
      const journalDto = await persistPostedJournal(
        tx,
        companyId,
        userId,
        eventType,
        instruction,
        accountMap,
        this.periodGuard,
        this.sequenceService,
        this.auditService,
        origId,
        revReason,
      );
      postedJournals.push(journalDto);
    }

    return postedJournals;
  }

  private async loadCompanySettings(
    tx: TenantPrisma,
    companyId: string,
  ): Promise<AccountingSettings> {
    const settingsRows = await tx.companySetting.findMany({
      where: { companyId },
    });
    const map = new Map(settingsRows.map((s) => [s.key, s.value]));

    return {
      revenue_recognition:
        (map.get('revenue_recognition') as AccountingSettings['revenue_recognition']) ??
        'ON_BOOKING',
      vat_rate: Number(map.get('vat_rate') ?? 0),
      cancellation_deduction_rate: Number(map.get('cancellation_deduction_rate') ?? 0.1),
      late_fee_rate: Number(map.get('late_fee_rate') ?? 0),
      allow_suspense_receipts: Boolean(map.get('allow_suspense_receipts')),
      show_discount_gross: Boolean(map.get('show_discount_gross')),
    };
  }

  private async enrichPayloadIfReversal(
    tx: TenantPrisma,
    companyId: string,
    eventType: string,
    payload: unknown,
  ): Promise<unknown> {
    if (eventType !== 'PAYMENT_REVERSED') {
      return payload;
    }

    const reversalPayload = payload as { originalJournalId?: string };
    if (!reversalPayload?.originalJournalId) {
      return payload;
    }

    const origJournal = await tx.journal.findFirst({
      where: { id: reversalPayload.originalJournalId, companyId },
      include: {
        lines: {
          include: {
            account: { select: { code: true, name: true } },
          },
        },
      },
    });

    if (!origJournal) {
      throw new NotFoundException(
        `Original journal with ID "${reversalPayload.originalJournalId}" not found for reversal`,
      );
    }

    return {
      ...reversalPayload,
      originalLines: origJournal.lines.map((l) => ({
        accountCode: l.account.code,
        debitPaisa: l.debitPaisa,
        creditPaisa: l.creditPaisa,
        partyType: l.partyType,
        partyId: l.partyId,
        projectId: l.projectId,
      })),
    };
  }
}
