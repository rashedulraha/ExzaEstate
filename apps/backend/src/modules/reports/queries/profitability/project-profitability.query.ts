import { Injectable } from '@nestjs/common';
import { TenantDb } from '../../../../database/tenant-db.service.js';
import type { TenantPrisma } from '../../../../database/tenant-prisma.js';
import type { QueryProfitabilityDto } from '../../dto/query-profitability.dto.js';
import type { ProjectProfitabilityReportDto } from '../../dto/profitability-response.dto.js';
import {
  aggregateProjectFinancials,
  type RawProjectJournalLine,
} from './project-profitability.helper.js';

@Injectable()
export class ProjectProfitabilityQuery {
  constructor(private readonly tenantDb: TenantDb) {}

  async execute(
    companyId: string,
    dto: QueryProfitabilityDto,
    tx?: TenantPrisma,
  ): Promise<ProjectProfitabilityReportDto> {
    const runner = async (db: TenantPrisma) => {
      const projects = await db.project.findMany({
        where: {
          companyId,
          deletedAt: null,
          ...(dto.projectId ? { id: dto.projectId } : {}),
        },
        include: { costCenter: true },
        orderBy: { name: 'asc' },
      });

      const todayStr = new Date().toISOString().split('T')[0] ?? '';
      const effectiveEndDate = dto.endDate ? new Date(`${dto.endDate}T23:59:59.999Z`) : new Date();
      const effectiveStartDate = dto.startDate ? new Date(dto.startDate) : new Date('1970-01-01');

      const items = [];
      let grandRevenue = 0n;
      let grandCost = 0n;
      let profitableCount = 0;
      let lossMakingCount = 0;

      for (const project of projects) {
        const costCenterCode = project.costCenter?.code;

        // Fetch journal lines linked to this project or its cost center
        const lines = await db.journalLine.findMany({
          where: {
            companyId,
            journal: {
              status: { in: ['Posted', 'Locked'] },
              postingDate: { gte: effectiveStartDate, lte: effectiveEndDate },
            },
            OR: [
              { projectId: project.id },
              ...(costCenterCode ? [{ costCenter: costCenterCode }] : []),
            ],
          },
          include: { account: { select: { code: true } } },
        });

        const rawLines: RawProjectJournalLine[] = lines.map((l) => ({
          accountCode: l.account.code,
          debitPaisa: l.debitPaisa,
          creditPaisa: l.creditPaisa,
        }));

        const item = aggregateProjectFinancials(
          project.id,
          project.code,
          project.name,
          rawLines,
          project.estimatedBudgetPaisa,
        );

        items.push(item);
        const rev = BigInt(item.totalRevenuePaisa);
        const cost = BigInt(item.totalCostPaisa);
        grandRevenue += rev;
        grandCost += cost;

        if (item.isProfitable) {
          profitableCount++;
        } else {
          lossMakingCount++;
        }
      }

      const grandProfit = grandRevenue - grandCost;
      let overallMargin = 0;
      if (grandRevenue > 0n) {
        overallMargin = Number((grandProfit * 10_000n) / grandRevenue) / 100;
      }

      return {
        asOfDate: todayStr,
        startDate: dto.startDate,
        endDate: dto.endDate,
        summary: {
          totalRevenuePaisa: grandRevenue.toString(),
          totalCostPaisa: grandCost.toString(),
          totalProfitPaisa: grandProfit.toString(),
          overallMarginPercent: overallMargin,
          profitableProjectsCount: profitableCount,
          lossMakingProjectsCount: lossMakingCount,
        },
        projects: items,
      };
    };

    return tx ? runner(tx) : this.tenantDb.withCompany(companyId, runner);
  }
}
