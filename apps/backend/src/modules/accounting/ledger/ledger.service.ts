import { Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { type AccountType } from '@exzaestate/shared';
import { TenantDb } from '../../../database/tenant-db.service.js';
import type { TenantPrisma } from '../../../database/tenant-prisma.js';
import { QUEUE_NAMES } from '../../../jobs/queues.js';
import { QUEUE_DRIVER, type QueueDriver } from '../../../ports/index.js';
import { ExportLedgerDto } from './dto/export-ledger.dto.js';
import { ExportJobResponseDto, LedgerReportDto } from './dto/ledger-response.dto.js';
import { QueryLedgerDto } from './dto/query-ledger.dto.js';
import {
  buildLedgerReportDto,
  buildOpeningFilter,
  buildPeriodFilter,
  calculateOpeningBalance,
  computeClosingBalance,
  computePagination,
  getNormalBalance,
  parseLedgerDates,
  processLedgerLines,
  type RawLedgerLine,
} from './ledger.helper.js';

@Injectable()
export class LedgerService {
  constructor(
    private readonly tenantDb: TenantDb,
    @Optional()
    @Inject(QUEUE_DRIVER)
    private readonly queueDriver?: QueueDriver,
  ) {}

  private async resolveAccount(tx: TenantPrisma, companyId: string, query: QueryLedgerDto) {
    if (query.accountId) {
      const acc = await tx.account.findFirst({ where: { id: query.accountId, companyId } });
      if (!acc) throw new NotFoundException(`Account with ID "${query.accountId}" not found`);
      return acc;
    }
    if (query.accountCode) {
      const acc = await tx.account.findFirst({ where: { code: query.accountCode, companyId } });
      if (!acc) throw new NotFoundException(`Account with code "${query.accountCode}" not found`);
      return acc;
    }
    return null;
  }

  private async getOpeningBalance(
    tx: TenantPrisma,
    companyId: string,
    accountId: string | undefined,
    query: QueryLedgerDto,
    startDate: Date | undefined,
    normalBalance: 'DEBIT' | 'CREDIT',
  ): Promise<bigint> {
    if (!startDate) return 0n;
    const openFilter = buildOpeningFilter(
      companyId,
      accountId,
      query.costCenterId,
      query.projectId,
      startDate,
    );
    const openLines = await tx.journalLine.findMany({
      where: openFilter,
      select: { debitPaisa: true, creditPaisa: true },
    });
    return calculateOpeningBalance(openLines, normalBalance);
  }

  async getLedger(companyId: string, query: QueryLedgerDto): Promise<LedgerReportDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const account = await this.resolveAccount(tx, companyId, query);
      const { startDate, endDate } = parseLedgerDates(query);
      const normalBalance = account ? getNormalBalance(account.type as AccountType) : 'DEBIT';

      const openingBalance = await this.getOpeningBalance(
        tx,
        companyId,
        account?.id,
        query,
        startDate,
        normalBalance,
      );

      const limit = query.limit ?? 50;
      const periodFilter = buildPeriodFilter(
        companyId,
        account?.id,
        query.costCenterId,
        query.projectId,
        startDate,
        endDate,
      );
      const rawLines = await tx.journalLine.findMany({
        where: periodFilter,
        include: {
          journal: { select: { journalNumber: true, postingDate: true, narration: true } },
        },
        orderBy: [{ journal: { postingDate: 'asc' } }, { createdAt: 'asc' }, { id: 'asc' }],
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
        take: limit + 1,
      });

      const { hasMore, pageLines, nextCursor } = computePagination(rawLines, limit);

      const { mappedLines, totalDebitPaisa, totalCreditPaisa } = processLedgerLines(
        pageLines as RawLedgerLine[],
        openingBalance,
        normalBalance,
      );

      const closingBalance = computeClosingBalance(
        openingBalance,
        totalDebitPaisa,
        totalCreditPaisa,
        normalBalance,
      );

      return buildLedgerReportDto({
        account,
        openingBalance,
        totalDebit: totalDebitPaisa,
        totalCredit: totalCreditPaisa,
        closingBalance,
        mappedLines,
        nextCursor,
        hasMore,
      });
    });
  }

  async exportLedger(
    companyId: string,
    userId: string,
    dto: ExportLedgerDto,
  ): Promise<ExportJobResponseDto> {
    const payload = {
      companyId,
      userId,
      reportType: 'GENERAL_LEDGER',
      format: dto.format ?? 'PDF',
      filters: dto,
      requestedAt: new Date().toISOString(),
    };

    let jobId: string = crypto.randomUUID();
    if (this.queueDriver) {
      jobId = await this.queueDriver.enqueue(QUEUE_NAMES.REPORT_EXPORT, payload);
    }

    return {
      jobId,
      status: 'QUEUED',
      message: 'General Ledger export job queued successfully',
    };
  }
}
