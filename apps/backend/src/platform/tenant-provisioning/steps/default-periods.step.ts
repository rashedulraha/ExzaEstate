import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProvisioningContext, ProvisioningStep } from '../provisioning-step.interface.js';

interface PeriodDef {
  periodNumber: number;
  name: string;
  startDate: Date;
  endDate: Date;
}

function generatePeriods(
  startYear: number,
  startMonth: number,
): {
  fyName: string;
  startDate: Date;
  endDate: Date;
  periods: PeriodDef[];
} {
  const endYear = startMonth === 1 ? startYear : startYear + 1;
  const fyName = startMonth === 1 ? `FY ${startYear}` : `FY ${startYear}-${endYear}`;

  const startDate = new Date(Date.UTC(startYear, startMonth - 1, 1));
  const endDate = new Date(Date.UTC(endYear, ((startMonth - 1 + 12) % 12) + 1, 0));

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const periods: PeriodDef[] = [];
  for (let i = 0; i < 12; i++) {
    const curMonthIndex = (startMonth - 1 + i) % 12;
    const curYear = startYear + Math.floor((startMonth - 1 + i) / 12);
    const pStart = new Date(Date.UTC(curYear, curMonthIndex, 1));
    const pEnd = new Date(Date.UTC(curYear, curMonthIndex + 1, 0));

    periods.push({
      periodNumber: i + 1,
      name: `${monthNames[curMonthIndex]} ${curYear}`,
      startDate: pStart,
      endDate: pEnd,
    });
  }

  return { fyName, startDate, endDate, periods };
}

@Injectable()
export class DefaultPeriodsStep implements ProvisioningStep {
  readonly name = 'DefaultPeriodsStep';
  readonly order = 85;
  private readonly logger = new Logger(DefaultPeriodsStep.name);

  async execute(ctx: ProvisioningContext, tx: Prisma.TransactionClient): Promise<void> {
    const currentYear = 2026;
    const startMonth = 7; // July-June standard Bangladesh fiscal year

    const { fyName, startDate, endDate, periods } = generatePeriods(currentYear, startMonth);

    const fiscalYear = await tx.fiscalYear.upsert({
      where: {
        companyId_name: {
          companyId: ctx.companyId,
          name: fyName,
        },
      },
      update: {
        startDate,
        endDate,
      },
      create: {
        companyId: ctx.companyId,
        name: fyName,
        startDate,
        endDate,
        isClosed: false,
      },
    });

    for (const p of periods) {
      await tx.accountingPeriod.upsert({
        where: {
          companyId_fiscalYearId_periodNumber: {
            companyId: ctx.companyId,
            fiscalYearId: fiscalYear.id,
            periodNumber: p.periodNumber,
          },
        },
        update: {
          name: p.name,
          startDate: p.startDate,
          endDate: p.endDate,
        },
        create: {
          companyId: ctx.companyId,
          fiscalYearId: fiscalYear.id,
          periodNumber: p.periodNumber,
          name: p.name,
          startDate: p.startDate,
          endDate: p.endDate,
          status: 'Open',
        },
      });
    }

    this.logger.log(
      `Provisioned fiscal year ${fyName} and 12 periods for company ${ctx.companyCode}`,
    );
  }
}
