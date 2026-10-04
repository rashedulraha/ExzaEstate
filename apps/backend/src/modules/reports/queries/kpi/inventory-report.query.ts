import { Injectable } from '@nestjs/common';
import { formatMoney } from '@exzaestate/shared';
import { TenantDb } from '../../../../database/tenant-db.service.js';
import type { TenantPrisma } from '../../../../database/tenant-prisma.js';
import { computeInventoryBreakdown } from './kpi-calculation.helper.js';
import type { InventoryStatusBreakdown, QueryKpiFilterDto } from './kpi.types.js';

export interface InventoryReportRow {
  propertyId: string;
  propertyCode: string;
  projectName: string;
  status: string;
  type: string;
  areaSqft: number;
  totalPricePaisa: string;
  totalPriceFormatted: string;
}

export interface InventoryReportResult {
  asOfDate: string;
  summary: InventoryStatusBreakdown & {
    totalValueFormatted: string;
    availableValueFormatted: string;
  };
  rows: InventoryReportRow[];
}

@Injectable()
export class InventoryReportQuery {
  constructor(private readonly tenantDb: TenantDb) {}

  async execute(
    companyId: string,
    filter: QueryKpiFilterDto = {},
    tx?: TenantPrisma,
  ): Promise<InventoryReportResult> {
    const runner = async (db: TenantPrisma): Promise<InventoryReportResult> => {
      const properties = await db.property.findMany({
        where: {
          companyId,
          deletedAt: null,
          ...(filter.projectId ? { projectId: filter.projectId } : {}),
        },
        orderBy: { code: 'asc' },
      });

      const projectIds = [...new Set(properties.map((p) => p.projectId))];
      const projects = await db.project.findMany({
        where: { companyId, id: { in: projectIds } },
        select: { id: true, name: true },
      });
      const projectMap = new Map(projects.map((proj) => [proj.id, proj.name]));

      const breakdown = computeInventoryBreakdown(properties);
      const rows: InventoryReportRow[] = [];

      for (const p of properties) {
        const val = p.netPricePaisa ?? 0n;
        rows.push({
          propertyId: p.id,
          propertyCode: p.code,
          projectName: projectMap.get(p.projectId) ?? 'Unknown',
          status: p.status,
          type: p.type,
          areaSqft: Number(p.areaSqft),
          totalPricePaisa: val.toString(),
          totalPriceFormatted: formatMoney(val),
        });
      }

      return {
        asOfDate: new Date().toISOString().split('T')[0] ?? '',
        summary: {
          ...breakdown,
          totalValueFormatted: formatMoney(BigInt(breakdown.totalInventoryValuePaisa)),
          availableValueFormatted: formatMoney(BigInt(breakdown.availableInventoryValuePaisa)),
        },
        rows,
      };
    };

    return tx ? runner(tx) : this.tenantDb.withCompany(companyId, runner);
  }
}
