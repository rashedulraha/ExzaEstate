import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DemoSeedContext, DemoSeedStep } from '../demo-seed-step.interface.js';

interface DemoExpenseTemplate {
  voucherNumber: string;
  categoryCode: string;
  projectCode?: string;
  costCenter?: string;
  payeeName: string;
  amountPaisa: bigint;
  description: string;
  status: 'DRAFT' | 'SUBMITTED' | 'VERIFIED' | 'APPROVED' | 'PAID' | 'REJECTED';
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE';
  daysAgo: number;
}

const DEMO_EXPENSE_TEMPLATES: DemoExpenseTemplate[] = [
  {
    voucherNumber: 'EXP-2026-000001',
    categoryCode: 'CAT-CONST-CIVIL',
    projectCode: 'PRJ-PUR-001',
    costCenter: 'CC-PUR-001',
    payeeName: 'National Builders & Piling Ltd',
    amountPaisa: 45_000_000n, // ৳4,50,000
    description: 'Site preparation and hydraulic foundation piling mobilization advance',
    status: 'PAID',
    paymentMethod: 'BANK_TRANSFER',
    daysAgo: 25,
  },
  {
    voucherNumber: 'EXP-2026-000002',
    categoryCode: 'CAT-UTIL-ELEC',
    projectCode: 'PRJ-BRV-002',
    costCenter: 'CC-BRV-002',
    payeeName: 'Energypac Power Generation Ltd',
    amountPaisa: 125_000_000n, // ৳12,50,000 (Requires MD approval)
    description: '33/11kV Substation 500kVA transformer advance and DPDC line charges',
    status: 'APPROVED',
    paymentMethod: 'BANK_TRANSFER',
    daysAgo: 10,
  },
  {
    voucherNumber: 'EXP-2026-000003',
    categoryCode: 'CAT-CONSULT-ENG',
    projectCode: 'PRJ-PUR-001',
    costCenter: 'CC-PUR-001',
    payeeName: 'CEGIS & Structural Design Associates',
    amountPaisa: 18_000_000n, // ৳1,80,000
    description: 'Geotechnical borehole soil testing & RCC foundation structural vetting report',
    status: 'VERIFIED',
    paymentMethod: 'CHEQUE',
    daysAgo: 7,
  },
  {
    voucherNumber: 'EXP-2026-000004',
    categoryCode: 'CAT-MKT-PROMO',
    payeeName: 'Brandline Outdoor Media Ltd',
    amountPaisa: 32_000_000n, // ৳3,20,000
    description: 'Kuril flyover & 300ft Expressway digital billboard campaign for Purbachal launch',
    status: 'SUBMITTED',
    paymentMethod: 'BANK_TRANSFER',
    daysAgo: 4,
  },
  {
    voucherNumber: 'EXP-2026-000005',
    categoryCode: 'CAT-OFFICE-ADMIN',
    payeeName: 'Dhaka Business Solutions Ltd',
    amountPaisa: 6_500_000n, // ৳65,000
    description: 'Quarterly head office high-speed internet lease line and workstation IT supplies',
    status: 'DRAFT',
    paymentMethod: 'BANK_TRANSFER',
    daysAgo: 2,
  },
  {
    voucherNumber: 'EXP-2026-000006',
    categoryCode: 'CAT-SITE-MAINT',
    projectCode: 'PRJ-BRV-002',
    costCenter: 'CC-BRV-002',
    payeeName: 'Surma Site Security Services Ltd',
    amountPaisa: 12_000_000n, // ৳1,20,000
    description:
      'Monthly round-the-clock site security personnel and perimeter floodlight maintenance',
    status: 'PAID',
    paymentMethod: 'BANK_TRANSFER',
    daysAgo: 15,
  },
];

function resolveExpenseTimestamps(status: DemoExpenseTemplate['status'], expenseDate: Date) {
  const verifiedStatuses = new Set(['VERIFIED', 'APPROVED', 'PAID']);
  const approvedStatuses = new Set(['APPROVED', 'PAID']);

  return {
    submittedAt: status === 'DRAFT' ? null : expenseDate,
    verifiedAt: verifiedStatuses.has(status) ? expenseDate : null,
    approvedAt: approvedStatuses.has(status) ? expenseDate : null,
    paidAt: status === 'PAID' ? expenseDate : null,
  };
}

function pickApproverId(requiresMdApproval: boolean, mdId?: string, gmId?: string): string | null {
  if (requiresMdApproval) {
    return mdId || gmId || null;
  }
  return gmId || mdId || null;
}

function resolveExpenseActors(
  approverId: string | null,
  primaryOperator: string | null,
  timestamps: ReturnType<typeof resolveExpenseTimestamps>,
) {
  return {
    createdById: primaryOperator,
    verifiedById: timestamps.verifiedAt ? primaryOperator : null,
    approvedById: timestamps.approvedAt ? approverId : null,
    paidById: timestamps.paidAt ? primaryOperator : null,
  };
}

@Injectable()
export class DemoExpenseStep implements DemoSeedStep {
  readonly name = 'DemoExpenseStep';
  readonly order = 85;
  private readonly logger = new Logger(DemoExpenseStep.name);

  private buildExpensePayload(
    tmpl: DemoExpenseTemplate,
    categoryId: string,
    projectId: string | null,
    now: Date,
    mdId?: string,
    gmId?: string,
    accountantId?: string,
  ) {
    const expenseDate = new Date(now.getTime() - tmpl.daysAgo * 86_400_000);
    const requiresMdApproval = tmpl.amountPaisa > 50_000_000n;
    const timestamps = resolveExpenseTimestamps(tmpl.status, expenseDate);
    const primaryOperator = accountantId || mdId || null;
    const approverId = pickApproverId(requiresMdApproval, mdId, gmId);
    const actors = resolveExpenseActors(approverId, primaryOperator, timestamps);

    return {
      categoryId,
      projectId,
      costCenter: tmpl.costCenter ?? null,
      payeeName: tmpl.payeeName,
      amountPaisa: tmpl.amountPaisa,
      description: tmpl.description,
      expenseDate,
      status: tmpl.status,
      requiresMdApproval,
      paymentMethod: tmpl.paymentMethod,
      ...timestamps,
      ...actors,
    };
  }

  async execute(ctx: DemoSeedContext, tx: Prisma.TransactionClient): Promise<void> {
    const categories = await tx.expenseCategory.findMany({
      where: { companyId: ctx.companyId },
    });
    const categoryMap = new Map(categories.map((c) => [c.code, c.id]));

    const projects = await tx.project.findMany({
      where: { companyId: ctx.companyId },
    });
    const projectMap = new Map(projects.map((p) => [p.code, p.id]));

    const mdId = ctx.state.get('managingDirectorUserId') as string | undefined;
    const accountantId = ctx.state.get('demoUserId:ACCOUNTANT:accountant@exzaestate.com') as
      | string
      | undefined;
    const gmId = ctx.state.get('demoUserId:GENERAL_MANAGER:gm@exzaestate.com') as
      | string
      | undefined;

    const now = new Date();

    for (const tmpl of DEMO_EXPENSE_TEMPLATES) {
      const categoryId = categoryMap.get(tmpl.categoryCode);
      if (!categoryId) {
        this.logger.warn(
          `Category code ${tmpl.categoryCode} not found for expense voucher ${tmpl.voucherNumber}`,
        );
        continue;
      }

      const projectId = tmpl.projectCode ? (projectMap.get(tmpl.projectCode) ?? null) : null;
      const voucherData = this.buildExpensePayload(
        tmpl,
        categoryId,
        projectId,
        now,
        mdId,
        gmId,
        accountantId,
      );

      await tx.expenseVoucher.upsert({
        where: {
          companyId_voucherNumber: {
            companyId: ctx.companyId,
            voucherNumber: tmpl.voucherNumber,
          },
        },
        update: {
          ...voucherData,
          deletedAt: null,
        },
        create: {
          companyId: ctx.companyId,
          voucherNumber: tmpl.voucherNumber,
          ...voucherData,
        },
      });
    }

    this.logger.log(
      `Seeded ${DEMO_EXPENSE_TEMPLATES.length} operational expense vouchers for company ${ctx.companyCode}`,
    );
  }
}
