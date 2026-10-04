import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ACCOUNT_TYPES } from '@exzaestate/shared';
import { TenantDb } from '../../../database/tenant-db.service.js';
import { IncomeStatementReportDto } from '../dto/income-statement-response.dto.js';
import { QueryIncomeStatementDto } from '../dto/query-income-statement.dto.js';
import { buildIncomeStatementReport, processIncomeAccounts } from './income-statement.helper.js';

@Injectable()
export class IncomeStatementQuery {
  constructor(private readonly tenantDb: TenantDb) {}

  async execute(
    companyId: string,
    dto: QueryIncomeStatementDto,
  ): Promise<IncomeStatementReportDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const todayStr = new Date().toISOString().split('T')[0] ?? '';
      const effectiveEndDateStr = dto.endDate || todayStr;
      const effectiveStartDateStr = dto.startDate || '1970-01-01';

      const startDate = new Date(effectiveStartDateStr);
      const endDate = new Date(`${effectiveEndDateStr}T23:59:59.999Z`);

      const accounts = await tx.account.findMany({
        where: {
          companyId,
          type: { in: [ACCOUNT_TYPES.INCOME, 'REVENUE', ACCOUNT_TYPES.EXPENSE] },
          isActive: true,
        },
        orderBy: { code: 'asc' },
      });

      const linesWhere: Prisma.JournalLineWhereInput = {
        companyId,
        ...(dto.costCenterId ? { costCenter: dto.costCenterId } : {}),
        ...(dto.projectId ? { projectId: dto.projectId } : {}),
        journal: {
          status: { in: ['Posted', 'Locked'] },
          postingDate: { gte: startDate, lte: endDate },
        },
      };

      const lines = await tx.journalLine.findMany({
        where: linesWhere,
        select: { accountId: true, debitPaisa: true, creditPaisa: true },
      });

      const buckets = processIncomeAccounts(accounts, lines, !!dto.includeZeroBalance);

      return buildIncomeStatementReport(effectiveStartDateStr, effectiveEndDateStr, buckets);
    });
  }
}
