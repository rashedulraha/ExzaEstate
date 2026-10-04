import { HttpStatus, Injectable } from '@nestjs/common';
import { ERROR_CODES } from '@exzaestate/shared';
import { AppException } from '../../../common/exceptions/app.exception.js';
import { TenantDb } from '../../../database/tenant-db.service.js';
import type { TenantPrisma } from '../../../database/tenant-prisma.js';
import type { AccountingPeriod } from '@prisma/client';

@Injectable()
export class PeriodGuard {
  constructor(private readonly tenantDb: TenantDb) {}

  /**
   * Asserts that an accounting period covering the given transaction date exists and has status 'Open'.
   * Throws AppException with PERIOD_CLOSED (HTTP 422) if closed or missing.
   */
  async assertOpen(
    companyId: string,
    date: Date | string,
    existingTx?: TenantPrisma,
  ): Promise<AccountingPeriod> {
    const targetDate = typeof date === 'string' ? new Date(date) : date;
    const dateStr = typeof date === 'string' ? date : date.toISOString().slice(0, 10);

    const check = async (tx: TenantPrisma): Promise<AccountingPeriod> => {
      const period = await tx.accountingPeriod.findFirst({
        where: {
          companyId,
          startDate: { lte: targetDate },
          endDate: { gte: targetDate },
        },
      });

      if (!period || period.status !== 'Open') {
        throw new AppException(
          ERROR_CODES.PERIOD_CLOSED,
          `Accounting period for date ${dateStr} is ${period?.status ?? 'missing'}`,
          {
            date: dateStr,
            periodId: period?.id,
            status: period?.status ?? 'Missing',
          },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }

      return period;
    };

    if (existingTx) {
      return check(existingTx);
    }

    return this.tenantDb.withCompany(companyId, async (tx) => check(tx));
  }
}
