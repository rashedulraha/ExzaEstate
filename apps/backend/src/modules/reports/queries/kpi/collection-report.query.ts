import { Injectable } from '@nestjs/common';
import { formatMoney } from '@exzaestate/shared';
import { TenantDb } from '../../../../database/tenant-db.service.js';
import type { TenantPrisma } from '../../../../database/tenant-prisma.js';
import { buildPaymentWhere } from './kpi-calculation.helper.js';
import type { QueryKpiFilterDto } from './kpi.types.js';

export interface CollectionReportRow {
  paymentId: string;
  paymentNumber: string;
  receiptNumber?: string | null;
  customerName: string;
  amountPaisa: string;
  amountFormatted: string;
  paymentMethod: string;
  paymentType: string;
  postedAt: string;
}

export interface CollectionReportResult {
  asOfDate: string;
  period: { startDate?: string; endDate?: string };
  summary: {
    totalCollectionPaisa: string;
    totalCollectionFormatted: string;
    totalCollectionCount: number;
  };
  rows: CollectionReportRow[];
}

@Injectable()
export class CollectionReportQuery {
  constructor(private readonly tenantDb: TenantDb) {}

  async execute(
    companyId: string,
    filter: QueryKpiFilterDto = {},
    tx?: TenantPrisma,
  ): Promise<CollectionReportResult> {
    const runner = async (db: TenantPrisma): Promise<CollectionReportResult> => {
      const where = buildPaymentWhere(companyId, filter);

      const payments = await db.payment.findMany({
        where,
        include: {
          customer: { select: { name: true } },
          receipt: { select: { receiptNumber: true } },
        },
        orderBy: { postedAt: 'desc' },
      });

      let totalCollectionPaisa = 0n;
      const rows: CollectionReportRow[] = [];

      for (const p of payments) {
        totalCollectionPaisa += p.amountPaisa;
        rows.push({
          paymentId: p.id,
          paymentNumber: p.paymentNumber,
          receiptNumber: p.receipt?.receiptNumber ?? null,
          customerName: p.customer.name,
          amountPaisa: p.amountPaisa.toString(),
          amountFormatted: formatMoney(p.amountPaisa),
          paymentMethod: p.paymentMethod,
          paymentType: p.paymentType,
          postedAt: p.postedAt?.toISOString() ?? p.paymentDate.toISOString(),
        });
      }

      return {
        asOfDate: new Date().toISOString().split('T')[0] ?? '',
        period: { startDate: filter.startDate, endDate: filter.endDate },
        summary: {
          totalCollectionPaisa: totalCollectionPaisa.toString(),
          totalCollectionFormatted: formatMoney(totalCollectionPaisa),
          totalCollectionCount: payments.length,
        },
        rows,
      };
    };

    return tx ? runner(tx) : this.tenantDb.withCompany(companyId, runner);
  }
}
