import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DemoSeedContext, DemoSeedStep } from '../demo-seed-step.interface.js';

interface DemoChargeTypeDef {
  code: string;
  name: string;
  description: string;
  calculationType: 'FIXED' | 'PERCENTAGE';
  defaultAmountPaisa?: bigint;
  defaultRatePct?: number;
  isIncludedInNetPrice: boolean;
  vatRatePct: number;
  payableStage: 'AT_BOOKING' | 'IN_SCHEDULE' | 'AT_HANDOVER' | 'ON_DEMAND';
  isActive: boolean;
}

const DEMO_CHARGE_TYPES: DemoChargeTypeDef[] = [
  {
    code: 'REGISTRATION',
    name: 'Registration & Stamp Duty (রেজিস্ট্রেশন ও স্ট্যাম্প ডিউটি)',
    description:
      'Government land and property registration, stamp duty, local council tax, and deed processing charges.',
    calculationType: 'PERCENTAGE',
    defaultRatePct: 8.0,
    isIncludedInNetPrice: false,
    vatRatePct: 0.0,
    payableStage: 'AT_HANDOVER',
    isActive: true,
  },
  {
    code: 'UTILITY',
    name: 'Utility Connection Fees (বিদ্যুৎ, গ্যাস ও ওয়াসা সংযোগ ফি)',
    description:
      'DESCO/DPDC electricity substation share, WASA water/sewerage connection, and gas utility distribution infrastructure.',
    calculationType: 'FIXED',
    defaultAmountPaisa: 15_000_000n, // ৳1,50,000
    isIncludedInNetPrice: false,
    vatRatePct: 5.0,
    payableStage: 'AT_HANDOVER',
    isActive: true,
  },
  {
    code: 'PARKING',
    name: 'Car Parking Space Allocation (গাড়ি পার্কিং স্থান বরাদ্দ)',
    description:
      'Basement or ground floor reserved covered car parking lot space allocation charge.',
    calculationType: 'FIXED',
    defaultAmountPaisa: 50_000_000n, // ৳5,00,000
    isIncludedInNetPrice: false,
    vatRatePct: 0.0,
    payableStage: 'AT_BOOKING',
    isActive: true,
  },
  {
    code: 'DEVELOPMENT',
    name: 'Development & Municipal Charge (উন্নয়ন ও পৌর চার্জ)',
    description:
      'City corporation/municipal infrastructure development charge, fire safety system share, and perimeter security levy.',
    calculationType: 'PERCENTAGE',
    defaultRatePct: 2.0,
    isIncludedInNetPrice: false,
    vatRatePct: 0.0,
    payableStage: 'IN_SCHEDULE',
    isActive: true,
  },
  {
    code: 'LEGAL',
    name: 'Legal & Documentation Fee (আইনি ও দলিল ফি)',
    description:
      'Legal vetting, title search, deed drafting, affidavit preparation, and notary verification fees.',
    calculationType: 'FIXED',
    defaultAmountPaisa: 5_000_000n, // ৳50,000
    isIncludedInNetPrice: false,
    vatRatePct: 0.0,
    payableStage: 'AT_BOOKING',
    isActive: true,
  },
  {
    code: 'CLUB',
    name: 'Club & Community Membership (কমিউনিটি ও ক্লাব মেম্বারশিপ)',
    description: 'Access to rooftop lounge, swimming pool, gymnasium, and resident community hall.',
    calculationType: 'FIXED',
    defaultAmountPaisa: 20_000_000n, // ৳2,00,000
    isIncludedInNetPrice: false,
    vatRatePct: 15.0,
    payableStage: 'AT_HANDOVER',
    isActive: true,
  },
  {
    code: 'TRANSFER',
    name: 'Ownership Transfer Fee (মালিকানা হস্তান্তর ফি)',
    description:
      'Standard administrative and transfer documentation charge on assignment or resale prior to registration.',
    calculationType: 'PERCENTAGE',
    defaultRatePct: 3.0,
    isIncludedInNetPrice: false,
    vatRatePct: 0.0,
    payableStage: 'ON_DEMAND',
    isActive: true,
  },
];

@Injectable()
export class DemoChargeStep implements DemoSeedStep {
  private readonly logger = new Logger(DemoChargeStep.name);
  readonly name = 'DemoChargeStep';
  readonly order = 65;

  async execute(ctx: DemoSeedContext, tx: Prisma.TransactionClient): Promise<void> {
    let createdCount = 0;

    for (const def of DEMO_CHARGE_TYPES) {
      const existing = await tx.chargeType.findFirst({
        where: {
          companyId: ctx.companyId,
          code: def.code,
          deletedAt: null,
        },
      });

      if (!existing) {
        await tx.chargeType.create({
          data: {
            companyId: ctx.companyId,
            code: def.code,
            name: def.name,
            description: def.description,
            calculationType: def.calculationType,
            defaultAmountPaisa: def.defaultAmountPaisa ?? null,
            defaultRatePct: def.defaultRatePct ?? null,
            isIncludedInNetPrice: def.isIncludedInNetPrice,
            vatRatePct: def.vatRatePct,
            payableStage: def.payableStage,
            isActive: def.isActive,
          },
        });
        createdCount++;
      }
    }

    this.logger.log(
      `Demo Charge Types seed completed: ${createdCount} charge types created for company ${ctx.companyId}`,
    );
  }
}
