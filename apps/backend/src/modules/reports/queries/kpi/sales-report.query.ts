import { Injectable } from '@nestjs/common';
import { formatMoney } from '@exzaestate/shared';
import { TenantDb } from '../../../../database/tenant-db.service.js';
import type { TenantPrisma } from '../../../../database/tenant-prisma.js';
import { buildSalesWhere } from './kpi-calculation.helper.js';
import type { QueryKpiFilterDto, ScopeFilterContext } from './kpi.types.js';

export interface SalesReportRow {
  bookingId: string;
  bookingNumber: string;
  customerName: string;
  projectName: string;
  propertyCode: string;
  confirmedAt: string;
  netPricePaisa: string;
  netPriceFormatted: string;
  totalPaidPaisa: string;
  totalPaidFormatted: string;
  salesExecutiveName: string;
}

export interface SalesReportResult {
  asOfDate: string;
  period: { startDate?: string; endDate?: string };
  summary: {
    totalSalesPaisa: string;
    totalSalesFormatted: string;
    totalSalesCount: number;
  };
  rows: SalesReportRow[];
}

@Injectable()
export class SalesReportQuery {
  constructor(private readonly tenantDb: TenantDb) {}

  async execute(
    companyId: string,
    filter: QueryKpiFilterDto = {},
    scopeCtx?: ScopeFilterContext,
    tx?: TenantPrisma,
  ): Promise<SalesReportResult> {
    const runner = async (db: TenantPrisma): Promise<SalesReportResult> => {
      let propertyIds: string[] | undefined;
      if (filter.projectId) {
        const projectProps = await db.property.findMany({
          where: { companyId, projectId: filter.projectId, deletedAt: null },
          select: { id: true },
        });
        propertyIds = projectProps.map((p) => p.id);
      }

      const where = buildSalesWhere(companyId, filter, scopeCtx, propertyIds);

      const bookings = await db.booking.findMany({
        where,
        orderBy: { confirmedAt: 'desc' },
      });

      const customerIds = [...new Set(bookings.map((b) => b.customerId))];
      const propIds = [...new Set(bookings.map((b) => b.propertyId))];
      const execIds = [...new Set(bookings.map((b) => b.salesExecutiveId))];

      const [customers, properties, executives] = await Promise.all([
        db.customer.findMany({
          where: { companyId, id: { in: customerIds } },
          select: { id: true, name: true },
        }),
        db.property.findMany({
          where: { companyId, id: { in: propIds } },
          select: { id: true, code: true, projectId: true },
        }),
        db.user.findMany({
          where: { companyId, id: { in: execIds } },
          select: { id: true, fullName: true },
        }),
      ]);

      const customerMap = new Map(customers.map((c) => [c.id, c.name]));
      const executiveMap = new Map(executives.map((e) => [e.id, e.fullName]));

      const projectIds = [...new Set(properties.map((p) => p.projectId))];
      const projects = await db.project.findMany({
        where: { companyId, id: { in: projectIds } },
        select: { id: true, name: true },
      });
      const projectMap = new Map(projects.map((pr) => [pr.id, pr.name]));
      const propertyMap = new Map(
        properties.map((p) => [
          p.id,
          { code: p.code, projectName: projectMap.get(p.projectId) ?? 'Unknown' },
        ]),
      );

      let totalSalesPaisa = 0n;
      const rows: SalesReportRow[] = [];

      for (const b of bookings) {
        totalSalesPaisa += b.netPricePaisa;
        const propInfo = propertyMap.get(b.propertyId);
        rows.push({
          bookingId: b.id,
          bookingNumber: b.bookingNumber,
          customerName: customerMap.get(b.customerId) ?? 'Unknown',
          projectName: propInfo?.projectName ?? 'Unknown',
          propertyCode: propInfo?.code ?? 'Unknown',
          confirmedAt: b.confirmedAt?.toISOString() ?? b.bookingDate.toISOString(),
          netPricePaisa: b.netPricePaisa.toString(),
          netPriceFormatted: formatMoney(b.netPricePaisa),
          totalPaidPaisa: b.totalPaidPaisa.toString(),
          totalPaidFormatted: formatMoney(b.totalPaidPaisa),
          salesExecutiveName: executiveMap.get(b.salesExecutiveId) ?? 'Unknown',
        });
      }

      return {
        asOfDate: new Date().toISOString().split('T')[0] ?? '',
        period: { startDate: filter.startDate, endDate: filter.endDate },
        summary: {
          totalSalesPaisa: totalSalesPaisa.toString(),
          totalSalesFormatted: formatMoney(totalSalesPaisa),
          totalSalesCount: bookings.length,
        },
        rows,
      };
    };

    return tx ? runner(tx) : this.tenantDb.withCompany(companyId, runner);
  }
}
