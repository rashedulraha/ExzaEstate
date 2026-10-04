import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TenantDb } from '../../../database/tenant-db.service.js';
import { BalanceSheetReportDto } from '../dto/balance-sheet-response.dto.js';
import { QueryBalanceSheetDto } from '../dto/query-balance-sheet.dto.js';
import { buildBalanceSheetReport, processBalanceSheetAccounts } from './balance-sheet.helper.js';

@Injectable()
export class BalanceSheetQuery {
  constructor(private readonly tenantDb: TenantDb) {}

  async execute(companyId: string, dto: QueryBalanceSheetDto): Promise<BalanceSheetReportDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const todayStr = new Date().toISOString().split('T')[0] ?? '';
      const asOfDateStr = dto.asOfDate || todayStr;
      const asOfDate = new Date(`${asOfDateStr}T23:59:59.999Z`);

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
          postingDate: { lte: asOfDate },
        },
      };

      const lines = await tx.journalLine.findMany({
        where: linesWhere,
        select: { accountId: true, debitPaisa: true, creditPaisa: true },
      });

      const buckets = processBalanceSheetAccounts(accounts, lines, !!dto.includeZeroBalance);

      return buildBalanceSheetReport(asOfDateStr, buckets);
    });
  }
}
