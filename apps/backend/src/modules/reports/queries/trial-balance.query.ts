import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TenantDb } from '../../../database/tenant-db.service.js';
import { QueryTrialBalanceDto } from '../dto/query-trial-balance.dto.js';
import { TrialBalanceReportDto } from '../dto/trial-balance-response.dto.js';
import {
  aggregateJournalLines,
  buildTrialBalanceReport,
  processTrialBalanceAccounts,
} from './trial-balance.helper.js';

@Injectable()
export class TrialBalanceQuery {
  constructor(private readonly tenantDb: TenantDb) {}

  async execute(companyId: string, dto: QueryTrialBalanceDto): Promise<TrialBalanceReportDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const todayStr = new Date().toISOString().split('T')[0] ?? '';
      const effectiveEndDateStr = dto.asOfDate || dto.endDate || todayStr;
      const effectiveStartDateStr = dto.startDate || '1970-01-01';

      const startDate = new Date(effectiveStartDateStr);
      const endDate = new Date(`${effectiveEndDateStr}T23:59:59.999Z`);

      const accounts = await tx.account.findMany({
        where: { companyId, isActive: true },
        orderBy: { code: 'asc' },
      });

      const linesWhere: Prisma.JournalLineWhereInput = {
        companyId,
        ...(dto.costCenterId ? { costCenter: dto.costCenterId } : {}),
        ...(dto.projectId ? { projectId: dto.projectId } : {}),
        journal: {
          status: { in: ['Posted', 'Locked'] },
          postingDate: { lte: endDate },
        },
      };

      const lines = await tx.journalLine.findMany({
        where: linesWhere,
        select: {
          accountId: true,
          debitPaisa: true,
          creditPaisa: true,
          journal: { select: { postingDate: true } },
        },
      });

      const balances = aggregateJournalLines(lines, startDate);
      const processed = processTrialBalanceAccounts(accounts, balances, !!dto.includeZeroBalance);

      return buildTrialBalanceReport(effectiveStartDateStr, effectiveEndDateStr, processed);
    });
  }
}
