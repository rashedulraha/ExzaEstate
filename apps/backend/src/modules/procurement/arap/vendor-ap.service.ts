import { Injectable } from '@nestjs/common';
import { differenceInCalendarDays } from 'date-fns';
import { TenantDb } from '../../../database/tenant-db.service.js';
import type { TenantPrisma } from '../../../database/tenant-prisma.js';

export interface VendorApAgingBucket {
  currentPaisa: bigint;
  days1To7Paisa: bigint;
  days8To30Paisa: bigint;
  days31To60Paisa: bigint;
  days61To90Paisa: bigint;
  daysOver90Paisa: bigint;
  totalPaisa: bigint;
}

@Injectable()
export class VendorApService {
  constructor(private readonly tenantDb: TenantDb) {}

  async getVendorApBalance(
    companyId: string,
    vendorId: string,
    tx?: TenantPrisma,
  ) {
    const runner = async (db: TenantPrisma) => {
      const vendor = await db.vendor.findFirst({
        where: { id: vendorId, companyId, deletedAt: null },
      });

      // Query Account 2100 (AP) journal lines for this vendor party
      const lines = await db.journalLine.findMany({
        where: {
          journal: { companyId, status: 'POSTED' },
          account: { code: '2100' },
          partyType: 'VENDOR',
          partyId: vendorId,
        },
      });

      let totalDebits = 0n;
      let totalCredits = 0n;
      for (const line of lines) {
        totalDebits += line.debitPaisa;
        totalCredits += line.creditPaisa;
      }

      // AP is a liability account: Credit increases balance, Debit decreases balance
      const account2100ApBalancePaisa = totalCredits - totalDebits;

      return {
        vendorId,
        vendorName: vendor?.name ?? 'Unknown Vendor',
        account2100ApBalancePaisa,
        vendorOutstandingPaisa: vendor?.outstandingPaisa ?? 0n,
        isReconciled: account2100ApBalancePaisa === (vendor?.outstandingPaisa ?? 0n),
      };
    };

    return tx ? runner(tx) : this.tenantDb.withCompany(companyId, runner);
  }

  async getVendorApAging(
    companyId: string,
    asOfDate: Date = new Date(),
    tx?: TenantPrisma,
  ) {
    const runner = async (db: TenantPrisma) => {
      const unpaidBills = await db.vendorBill.findMany({
        where: {
          companyId,
          status: { in: ['POSTED', 'PARTIALLY_PAID'] },
          deletedAt: null,
        },
        include: { vendor: true },
      });

      const buckets: VendorApAgingBucket = {
        currentPaisa: 0n,
        days1To7Paisa: 0n,
        days8To30Paisa: 0n,
        days31To60Paisa: 0n,
        days61To90Paisa: 0n,
        daysOver90Paisa: 0n,
        totalPaisa: 0n,
      };

      for (const bill of unpaidBills) {
        const remainingPaisa = bill.netPayablePaisa - bill.paidAmountPaisa;
        if (remainingPaisa <= 0n) continue;

        const baselineDate = bill.dueDate ?? bill.billDate;
        const daysOverdue = differenceInCalendarDays(asOfDate, baselineDate);

        buckets.totalPaisa += remainingPaisa;

        if (daysOverdue <= 0) {
          buckets.currentPaisa += remainingPaisa;
        } else if (daysOverdue <= 7) {
          buckets.days1To7Paisa += remainingPaisa;
        } else if (daysOverdue <= 30) {
          buckets.days8To30Paisa += remainingPaisa;
        } else if (daysOverdue <= 60) {
          buckets.days31To60Paisa += remainingPaisa;
        } else if (daysOverdue <= 90) {
          buckets.days61To90Paisa += remainingPaisa;
        } else {
          buckets.daysOver90Paisa += remainingPaisa;
        }
      }

      return buckets;
    };

    return tx ? runner(tx) : this.tenantDb.withCompany(companyId, runner);
  }

  async getVendorLedger(
    companyId: string,
    vendorId: string,
    tx?: TenantPrisma,
  ) {
    const runner = async (db: TenantPrisma) => {
      const lines = await db.journalLine.findMany({
        where: {
          journal: { companyId, status: 'POSTED' },
          account: { code: '2100' },
          partyType: 'VENDOR',
          partyId: vendorId,
        },
        include: { journal: true },
        orderBy: { journal: { postingDate: 'asc' } },
      });

      let runningBalancePaisa = 0n;
      const ledgerEntries = lines.map((l) => {
        runningBalancePaisa += l.creditPaisa - l.debitPaisa;
        return {
          id: l.id,
          journalId: l.journalId,
          journalNumber: l.journal.journalNumber,
          postingDate: l.journal.postingDate,
          description: l.description,
          debitPaisa: l.debitPaisa,
          creditPaisa: l.creditPaisa,
          runningBalancePaisa,
        };
      });

      return {
        vendorId,
        entries: ledgerEntries,
        finalBalancePaisa: runningBalancePaisa,
      };
    };

    return tx ? runner(tx) : this.tenantDb.withCompany(companyId, runner);
  }
}
