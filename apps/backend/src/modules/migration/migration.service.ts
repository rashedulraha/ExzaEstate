import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ERROR_CODES } from '@exzaestate/shared';
import { TenantDb } from '../../database/tenant-db.service.js';
import { AuditService } from '../../platform/audit/audit.service.js';
import { OutboxService } from '../../platform/outbox/outbox.service.js';
import { SequenceService } from '../../platform/sequence/sequence.service.js';
import type {
  AddLegacyBookingDto,
  CreateMigrationBatchDto,
  FinalizeMigrationBatchDto,
  MigrationBatchResponseDto,
  PostOpeningBalanceDto,
  ReconciliationGateResponseDto,
} from './dto/migration.dto.js';
import {
  assertBatchEditable,
  computeReconciliationGate,
  createLegacyBookingRecord,
  createOpeningJournalRecord,
  resolveAccountMap,
  toBatchDto,
  validateOpeningBalanceLines,
} from './migration.helper.js';

@Injectable()
export class MigrationService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly sequenceService: SequenceService,
    private readonly auditService: AuditService,
    private readonly outboxService: OutboxService,
  ) {}

  async createBatch(
    companyId: string,
    userId: string,
    dto: CreateMigrationBatchDto,
  ): Promise<MigrationBatchResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const fiscalYear = new Date().getFullYear().toString();
      const seq = await this.sequenceService.next(tx, {
        type: 'MIGRATION',
        fiscalYear,
        scopeKey: 'GLOBAL',
      });

      const batchNumber = this.sequenceService.format({
        prefix: 'MIG',
        fiscalYear,
        value: seq,
      });

      const batch = await tx.migrationBatch.create({
        data: {
          companyId,
          batchNumber,
          status: 'Draft',
          goLiveDate: new Date(dto.goLiveDate),
          notes: dto.notes,
          createdById: userId,
        },
      });

      await this.auditService.record(tx, {
        action: 'MIGRATION_BATCH_CREATED',
        module: 'migration',
        recordType: 'MigrationBatch',
        recordId: batch.id,
        after: {
          batchNumber: batch.batchNumber,
          goLiveDate: dto.goLiveDate,
        },
      });

      return toBatchDto(batch, 0);
    });
  }

  async postOpeningBalance(
    companyId: string,
    userId: string,
    batchId: string,
    dto: PostOpeningBalanceDto,
  ): Promise<{ journalId: string; totalAmountPaisa: string }> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const batch = await tx.migrationBatch.findFirst({
        where: { id: batchId, companyId },
      });
      assertBatchEditable(batch, batchId);

      const { totalDebitPaisa } = validateOpeningBalanceLines(dto);

      const accountCodes = Array.from(new Set(dto.lines.map((l) => l.accountCode)));
      const accountMap = await resolveAccountMap(tx, companyId, accountCodes);

      const journal = await createOpeningJournalRecord(
        tx,
        this.sequenceService,
        companyId,
        userId,
        batch,
        dto,
        totalDebitPaisa,
        accountMap,
      );

      await tx.migrationBatch.update({
        where: { id: batch.id },
        data: { openingJournalId: journal.id },
      });

      await this.auditService.record(tx, {
        action: 'OPENING_BALANCE_POSTED',
        module: 'migration',
        recordType: 'Journal',
        recordId: journal.id,
        after: {
          batchId: batch.id,
          journalNumber: journal.journalNumber,
          totalDebitPaisa: totalDebitPaisa.toString(),
        },
      });

      return {
        journalId: journal.id,
        totalAmountPaisa: totalDebitPaisa.toString(),
      };
    });
  }

  async addLegacyBooking(
    companyId: string,
    userId: string,
    batchId: string,
    dto: AddLegacyBookingDto,
  ): Promise<{ id: string; legacyBookingNo: string; outstandingPaisa: string }> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const batch = await tx.migrationBatch.findFirst({
        where: { id: batchId, companyId },
      });
      assertBatchEditable(batch, batchId);

      const record = await createLegacyBookingRecord(tx, companyId, userId, batchId, dto);

      await this.auditService.record(tx, {
        action: 'LEGACY_BOOKING_RECORDED',
        module: 'migration',
        recordType: 'LegacyBookingRecord',
        recordId: record.id,
        after: {
          batchId,
          legacyBookingNo: dto.legacyBookingNo,
          outstandingPaisa: record.outstandingPaisa.toString(),
        },
      });

      return {
        id: record.id,
        legacyBookingNo: record.legacyBookingNo,
        outstandingPaisa: record.outstandingPaisa.toString(),
      };
    });
  }

  async getReconciliationGate(
    companyId: string,
    batchId: string,
  ): Promise<ReconciliationGateResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const batch = await tx.migrationBatch.findFirst({
        where: { id: batchId, companyId },
      });

      if (!batch) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: `Migration batch "${batchId}" not found`,
        });
      }

      const arLines = batch.openingJournalId
        ? await tx.journalLine.findMany({
            where: {
              companyId,
              journalId: batch.openingJournalId,
              account: { code: '1100' },
            },
            select: { partyId: true, debitPaisa: true, creditPaisa: true },
          })
        : [];

      const legacyRecords = await tx.legacyBookingRecord.findMany({
        where: { companyId, batchId },
        include: { customer: { select: { name: true } } },
      });

      return computeReconciliationGate(batch.id, arLines, legacyRecords);
    });
  }

  async finalizeBatch(
    companyId: string,
    userId: string,
    batchId: string,
    dto?: FinalizeMigrationBatchDto,
  ): Promise<MigrationBatchResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const batch = await tx.migrationBatch.findFirst({
        where: { id: batchId, companyId },
      });

      if (!batch) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: `Migration batch "${batchId}" not found`,
        });
      }

      if (batch.status === 'Finalized') {
        throw new BadRequestException({
          code: ERROR_CODES.INVALID_STATE_TRANSITION,
          message: `Migration batch "${batchId}" is already finalized`,
        });
      }

      const gate = await this.getReconciliationGate(companyId, batchId);

      if (!gate.canFinalize && !dto?.approvedAdjustmentReason) {
        throw new BadRequestException({
          code: ERROR_CODES.VALIDATION_ERROR,
          message: `Migration reconciliation gate failed: Opening AR (${gate.totalOpeningArFormatted}) does not equal total legacy outstanding (${gate.totalLegacyOutstandingFormatted}). Difference: ${gate.differenceFormatted}. Approved adjustment reason is required to bypass.`,
          details: gate.customerDifferences,
        });
      }

      const updated = await tx.migrationBatch.update({
        where: { id: batch.id },
        data: {
          status: 'Finalized',
          finalizedAt: new Date(),
          finalizedById: userId,
          notes: dto?.approvedAdjustmentReason
            ? `${batch.notes ?? ''} [Approved Adjustment: ${dto.approvedAdjustmentReason}]`.trim()
            : batch.notes,
        },
      });

      const count = await tx.legacyBookingRecord.count({
        where: { companyId, batchId },
      });

      await this.auditService.record(tx, {
        action: 'MIGRATION_BATCH_FINALIZED',
        module: 'migration',
        recordType: 'MigrationBatch',
        recordId: batch.id,
        before: { status: 'Draft' },
        after: {
          status: 'Finalized',
          legacyBookingCount: count,
          approvedAdjustmentReason: dto?.approvedAdjustmentReason,
        },
      });

      await this.outboxService.emit(tx, 'migration.batch_finalized', {
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        goLiveDate: batch.goLiveDate.toISOString(),
      });

      return toBatchDto(updated, count);
    });
  }

  async getBatchById(companyId: string, batchId: string): Promise<MigrationBatchResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const batch = await tx.migrationBatch.findFirst({ where: { id: batchId, companyId } });
      if (!batch) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: `Migration batch "${batchId}" not found`,
        });
      }
      const count = await tx.legacyBookingRecord.count({ where: { companyId, batchId } });
      return toBatchDto(batch, count);
    });
  }

  async listBatches(companyId: string): Promise<{ items: MigrationBatchResponseDto[]; total: number }> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const batches = await tx.migrationBatch.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
      });
      return { items: batches.map((b) => toBatchDto(b)), total: batches.length };
    });
  }
}
