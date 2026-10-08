import { Injectable } from '@nestjs/common';
import { TenantDb } from '../../../../database/tenant-db.service.js';
import type { TenantPrisma } from '../../../../database/tenant-prisma.js';
import {
  buildPaymentWhere,
  buildSalesWhere,
  computeInventoryBreakdown,
} from './kpi-calculation.helper.js';
import type {
  ManagementKpis,
  QueryKpiFilterDto,
  SalespersonPerformanceDto,
  ScopeFilterContext,
} from './kpi.types.js';

@Injectable()
export class ManagementKpiQuery {
  constructor(private readonly tenantDb: TenantDb) {}

  async execute(
    companyId: string,
    filter: QueryKpiFilterDto = {},
    scopeCtx?: ScopeFilterContext,
    tx?: TenantPrisma,
  ): Promise<ManagementKpis> {
    const runner = async (db: TenantPrisma): Promise<ManagementKpis> => {
      let propertyIds: string[] | undefined;
      if (filter.projectId) {
        const projectProps = await db.property.findMany({
          where: { companyId, projectId: filter.projectId, deletedAt: null },
          select: { id: true },
        });
        propertyIds = projectProps.map((p) => p.id);
      }

      const salesWhere = buildSalesWhere(companyId, filter, scopeCtx, propertyIds);
      const paymentWhere = buildPaymentWhere(companyId, filter);

      // 1. Sales bookings
      const salesBookings = await db.booking.findMany({
        where: salesWhere,
        select: { netPricePaisa: true },
      });

      let totalSales = 0n;
      for (const b of salesBookings) {
        totalSales += b.netPricePaisa;
      }

      // 2. Collections
      const payments = await db.payment.findMany({
        where: paymentWhere,
        select: { amountPaisa: true },
      });

      let totalCollection = 0n;
      for (const p of payments) {
        totalCollection += p.amountPaisa;
      }

      // 3. Overdue installments
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const overdueInstallments = await db.installment.findMany({
        where: {
          companyId,
          paymentState: { in: ['Unpaid', 'Partially Paid'] },
          dueDate: { lt: today },
        },
        select: { remainingAmountPaisa: true },
      });

      let overdueAmount = 0n;
      for (const inst of overdueInstallments) {
        overdueAmount += inst.remainingAmountPaisa;
      }

      // 4. Receivables, Payables, Cash/Bank, Expenses from GL accounts
      const accounts = await db.account.findMany({
        where: { companyId },
        select: {
          code: true,
          type: true,
          journalLines: {
            where: { journal: { status: 'Posted' } },
            select: { debitPaisa: true, creditPaisa: true },
          },
        },
      });

      let arBalance = 0n;
      let apBalance = 0n;
      let cashBankBalance = 0n;
      let totalExpense = 0n;

      for (const acc of accounts) {
        let balance = 0n;
        if (Array.isArray(acc.journalLines)) {
          for (const line of acc.journalLines) {
            if (acc.type === 'ASSET' || acc.type === 'EXPENSE') {
              balance += line.debitPaisa - line.creditPaisa;
            } else {
              balance += line.creditPaisa - line.debitPaisa;
            }
          }
        } else if (
          'balancePaisa' in acc &&
          typeof (acc as Record<string, unknown>).balancePaisa === 'bigint'
        ) {
          balance = (acc as unknown as { balancePaisa: bigint }).balancePaisa;
        }
        if (acc.code === '1100') arBalance += balance;
        if (acc.code === '2100') apBalance += balance;
        if (acc.code === '1010' || acc.code === '1020') cashBankBalance += balance;
        if (acc.code.startsWith('5')) totalExpense += balance;
      }

      // 5. Inventory status
      const properties = await db.property.findMany({
        where: {
          companyId,
          deletedAt: null,
          ...(filter.projectId ? { projectId: filter.projectId } : {}),
        },
        select: {
          status: true,
          netPricePaisa: true,
        },
      });
      const inventory = computeInventoryBreakdown(properties);

      // 6. Lead conversion rate
      const totalLeads = await db.lead.count({ where: { companyId } });
      const convertedLeads = await db.lead.count({
        where: { companyId, status: 'CUSTOMER' },
      });
      const leadConversionRate =
        totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 10000) / 100 : 0;

      // 7. Collection efficiency: Collected ÷ (Due in period + Overdue brought forward)
      const collectionDenominator = totalCollection + overdueAmount;
      const collectionEfficiency =
        collectionDenominator > 0n
          ? Number((totalCollection * 10_000n) / collectionDenominator) / 100
          : 0;

      return {
        asOfDate: new Date().toISOString().split('T')[0] ?? '',
        period: {
          startDate: filter.startDate,
          endDate: filter.endDate,
        },
        totalSalesPaisa: totalSales.toString(),
        totalSalesCount: salesBookings.length,
        totalCollectionPaisa: totalCollection.toString(),
        totalCollectionCount: payments.length,
        outstandingReceivablePaisa: arBalance.toString(),
        overdueAmountPaisa: overdueAmount.toString(),
        overdueInstallmentsCount: overdueInstallments.length,
        totalExpensePaisa: totalExpense.toString(),
        accountsPayablePaisa: apBalance.toString(),
        cashBankBalancePaisa: cashBankBalance.toString(),
        inventory,
        performance: {
          leadConversionRatePercent: leadConversionRate,
          collectionEfficiencyPercent: collectionEfficiency,
        },
      };
    };

    return tx ? runner(tx) : this.tenantDb.withCompany(companyId, runner);
  }

  async getSalespersonPerformance(
    companyId: string,
    filter: QueryKpiFilterDto = {},
    scopeCtx?: ScopeFilterContext,
  ): Promise<SalespersonPerformanceDto[]> {
    return this.tenantDb.withCompany(companyId, async (db) => {
      let propertyIds: string[] | undefined;
      if (filter.projectId) {
        const projectProps = await db.property.findMany({
          where: { companyId, projectId: filter.projectId, deletedAt: null },
          select: { id: true },
        });
        propertyIds = projectProps.map((p) => p.id);
      }

      const salesWhere = buildSalesWhere(companyId, filter, scopeCtx, propertyIds);

      const executives = await db.user.findMany({
        where: {
          companyId,
          status: 'ACTIVE',
          ...(scopeCtx?.scope === 'OWN' && scopeCtx.userId ? { id: scopeCtx.userId } : {}),
        },
        select: { id: true, fullName: true },
      });

      const results: SalespersonPerformanceDto[] = [];

      for (const exec of executives) {
        const bookings = await db.booking.findMany({
          where: { ...salesWhere, salesExecutiveId: exec.id },
          select: { netPricePaisa: true },
        });

        let totalSalesValue = 0n;
        for (const b of bookings) {
          totalSalesValue += b.netPricePaisa;
        }

        const payments = await db.payment.findMany({
          where: {
            companyId,
            status: 'Posted',
            booking: { salesExecutiveId: exec.id },
          },
          select: { amountPaisa: true },
        });

        let totalCollected = 0n;
        for (const p of payments) {
          totalCollected += p.amountPaisa;
        }

        const assignedLeads = await db.lead.count({
          where: { companyId, assignedToId: exec.id },
        });
        const convertedLeads = await db.lead.count({
          where: { companyId, assignedToId: exec.id, status: 'CUSTOMER' },
        });

        const conversionRate =
          assignedLeads > 0 ? Math.round((convertedLeads / assignedLeads) * 10000) / 100 : 0;

        results.push({
          salesExecutiveId: exec.id,
          salesExecutiveName: exec.fullName,
          confirmedBookingsCount: bookings.length,
          totalSalesValuePaisa: totalSalesValue.toString(),
          totalCollectedPaisa: totalCollected.toString(),
          leadsAssignedCount: assignedLeads,
          leadsConvertedCount: convertedLeads,
          conversionRatePercent: conversionRate,
        });
      }

      return results;
    });
  }
}
