import { Injectable } from '@nestjs/common';
import { formatMoney } from '@exzaestate/shared';
import { TenantDb } from '../../../database/tenant-db.service.js';
import {
  computeTimingState,
  type InstallmentPaymentState,
} from '../installment/domain/installment-state.js';
import {
  AgingBucketKey,
  AGING_BUCKETS,
  resolveAgingBucket,
} from './domain/aging-buckets.js';
import {
  AgingBucketSummaryDto,
  AgingReportResponseDto,
  CustomerAgingSummaryDto,
  QueryAgingDto,
} from './dto/aging.dto.js';

@Injectable()
export class AgingService {
  constructor(private readonly tenantDb: TenantDb) {}

  async getAgingReport(
    companyId: string,
    query?: QueryAgingDto,
  ): Promise<AgingReportResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const asOfDate = query?.asOfDate ? new Date(query.asOfDate) : new Date();
      const asOfDateStr = asOfDate.toISOString().slice(0, 10);

      // 1. Fetch all active installments with remaining balance
      const installments = await tx.installment.findMany({
        where: {
          companyId,
          paymentState: { in: ['Unpaid', 'Partially Paid'] },
          remainingAmountPaisa: { gt: 0n },
          booking: {
            status: { notIn: ['Cancelled', 'Rejected'] },
          },
        },
        include: {
          booking: true,
        },
      });

      const customerIds = Array.from(new Set(installments.map((i) => i.booking.customerId)));
      const customers = await tx.customer.findMany({
        where: { companyId, id: { in: customerIds } },
        select: { id: true, name: true },
      });
      const customerNameMap = new Map(customers.map((c) => [c.id, c.name]));

      // 2. Initialize bucket accumulators
      const bucketTotals: Record<AgingBucketKey, { amountPaisa: bigint; count: number }> = {
        CURRENT: { amountPaisa: 0n, count: 0 },
        DAYS_1_7: { amountPaisa: 0n, count: 0 },
        DAYS_8_30: { amountPaisa: 0n, count: 0 },
        DAYS_31_60: { amountPaisa: 0n, count: 0 },
        DAYS_61_90: { amountPaisa: 0n, count: 0 },
        DAYS_90_PLUS: { amountPaisa: 0n, count: 0 },
      };

      // 3. Customer breakdown accumulator
      const customerMap = new Map<
        string,
        {
          customerId: string;
          customerName: string;
          amounts: Record<AgingBucketKey, bigint>;
          total: bigint;
        }
      >();

      let grandTotalPaisa = 0n;

      for (const inst of installments) {
        const { overdueDays } = computeTimingState({
          dueDate: inst.dueDate,
          paymentState: inst.paymentState as InstallmentPaymentState,
          referenceDate: asOfDate,
        });

        const bucketKey = resolveAgingBucket(overdueDays);
        const amount = inst.remainingAmountPaisa;

        bucketTotals[bucketKey].amountPaisa += amount;
        bucketTotals[bucketKey].count += 1;
        grandTotalPaisa += amount;

        const customerId = inst.booking.customerId;
        const customerName = customerNameMap.get(customerId) ?? 'Customer';


        let custRec = customerMap.get(customerId);
        if (!custRec) {
          custRec = {
            customerId,
            customerName,
            amounts: {
              CURRENT: 0n,
              DAYS_1_7: 0n,
              DAYS_8_30: 0n,
              DAYS_31_60: 0n,
              DAYS_61_90: 0n,
              DAYS_90_PLUS: 0n,
            },
            total: 0n,
          };
          customerMap.set(customerId, custRec);
        }

        custRec.amounts[bucketKey] += amount;
        custRec.total += amount;
      }

      // 4. Map bucket summaries
      const bucketDtos: AgingBucketSummaryDto[] = AGING_BUCKETS.map((b) => ({
        bucket: b.key,
        label: b.label,
        amountPaisa: bucketTotals[b.key].amountPaisa.toString(),
        amountFormatted: formatMoney(bucketTotals[b.key].amountPaisa),
        installmentCount: bucketTotals[b.key].count,
      }));

      // 5. Map customer rows
      const customerDtos: CustomerAgingSummaryDto[] = Array.from(customerMap.values()).map(
        (c) => ({
          customerId: c.customerId,
          customerName: c.customerName,
          currentPaisa: c.amounts.CURRENT.toString(),
          days1to7Paisa: c.amounts.DAYS_1_7.toString(),
          days8to30Paisa: c.amounts.DAYS_8_30.toString(),
          days31to60Paisa: c.amounts.DAYS_31_60.toString(),
          days61to90Paisa: c.amounts.DAYS_61_90.toString(),
          days90PlusPaisa: c.amounts.DAYS_90_PLUS.toString(),
          totalPaisa: c.total.toString(),
          formattedTotal: formatMoney(c.total),
        }),
      );

      // 6. Check reconciliation with Account 1100 AR balance
      const arLines = await tx.journalLine.findMany({
        where: {
          companyId,
          account: { code: '1100' },
          journal: { status: 'Posted' },
        },
        select: { debitPaisa: true, creditPaisa: true },
      });

      let arBalance = 0n;
      for (const l of arLines) {
        arBalance += l.debitPaisa - l.creditPaisa;
      }

      return {
        asOfDate: asOfDateStr,
        totalReceivablePaisa: grandTotalPaisa.toString(),
        totalReceivableFormatted: formatMoney(grandTotalPaisa),
        buckets: bucketDtos,
        byCustomer: customerDtos,
        reconciledWithArLedger: grandTotalPaisa === arBalance,
      };
    });
  }
}
