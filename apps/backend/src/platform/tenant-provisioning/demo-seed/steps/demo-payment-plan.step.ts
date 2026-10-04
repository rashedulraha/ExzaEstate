import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DemoSeedContext, DemoSeedStep } from '../demo-seed-step.interface.js';

interface DemoPlanTemplateDef {
  code: string;
  name: string;
  description: string;
  planType: 'EQUAL_INSTALLMENTS' | 'MILESTONE_BASED' | 'CUSTOM';
  frequency: 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY' | 'CUSTOM';
  installmentCount: number;
  minBookingPct: number;
  downPaymentPct: number;
  milestoneConfig: unknown;
  isActive: boolean;
  isDefault: boolean;
}

const DEMO_PAYMENT_PLANS: DemoPlanTemplateDef[] = [
  {
    code: 'STD-36M',
    name: 'Standard 36-Month Equal Installment Plan',
    description:
      'Standard residential plan with 10% booking money and remaining 90% divided into 36 equal monthly installments.',
    planType: 'EQUAL_INSTALLMENTS',
    frequency: 'MONTHLY',
    installmentCount: 36,
    minBookingPct: 10,
    downPaymentPct: 0,
    milestoneConfig: null,
    isActive: true,
    isDefault: true,
  },
  {
    code: 'FAST-12M',
    name: 'Fast-Track 12-Month Plan',
    description:
      'Accelerated plan with 20% booking money, 10% down payment, and 12 equal monthly installments for the remaining 70%.',
    planType: 'EQUAL_INSTALLMENTS',
    frequency: 'MONTHLY',
    installmentCount: 12,
    minBookingPct: 20,
    downPaymentPct: 10,
    milestoneConfig: null,
    isActive: true,
    isDefault: false,
  },
  {
    code: 'QUARTERLY-24M',
    name: 'Quarterly 24-Month Plan (8 Quarters)',
    description:
      'Convenient quarterly payment plan with 15% booking money and 8 quarterly installments over 2 years.',
    planType: 'EQUAL_INSTALLMENTS',
    frequency: 'QUARTERLY',
    installmentCount: 8,
    minBookingPct: 15,
    downPaymentPct: 0,
    milestoneConfig: null,
    isActive: true,
    isDefault: false,
  },
  {
    code: 'MILESTONE-CLP',
    name: 'Construction-Linked Milestone Plan',
    description:
      'Milestone-based plan: 10% booking, 10% down payment, and four 20% construction milestone disbursements.',
    planType: 'MILESTONE_BASED',
    frequency: 'CUSTOM',
    installmentCount: 4,
    minBookingPct: 10,
    downPaymentPct: 10,
    milestoneConfig: [
      { name: 'Piling & Foundation Completion', percentage: 25 },
      { name: 'Structure & Roof Casting', percentage: 25 },
      { name: 'Brickwork & Finishing', percentage: 25 },
      { name: 'Handover & Key Delivery', percentage: 25 },
    ],
    isActive: true,
    isDefault: false,
  },
];

@Injectable()
export class DemoPaymentPlanStep implements DemoSeedStep {
  private readonly logger = new Logger(DemoPaymentPlanStep.name);
  readonly name = 'DemoPaymentPlanStep';
  readonly order = 60;

  async execute(ctx: DemoSeedContext, tx: Prisma.TransactionClient): Promise<void> {
    let createdCount = 0;

    for (const def of DEMO_PAYMENT_PLANS) {
      const existing = await tx.paymentPlanTemplate.findFirst({
        where: {
          companyId: ctx.companyId,
          code: def.code,
          deletedAt: null,
        },
      });

      if (!existing) {
        await tx.paymentPlanTemplate.create({
          data: {
            companyId: ctx.companyId,
            code: def.code,
            name: def.name,
            description: def.description,
            planType: def.planType,
            frequency: def.frequency,
            installmentCount: def.installmentCount,
            minBookingPct: def.minBookingPct,
            downPaymentPct: def.downPaymentPct,
            milestoneConfig: def.milestoneConfig
              ? JSON.parse(JSON.stringify(def.milestoneConfig))
              : null,
            isActive: def.isActive,
            isDefault: def.isDefault,
          },
        });
        createdCount++;
      }
    }

    this.logger.log(
      `Demo Payment Plan seed completed: ${createdCount} templates created for company ${ctx.companyId}`,
    );
  }
}
