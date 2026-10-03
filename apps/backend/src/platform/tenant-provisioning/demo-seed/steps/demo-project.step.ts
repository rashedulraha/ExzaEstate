import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DemoSeedContext, DemoSeedStep } from '../demo-seed-step.interface.js';

interface DemoProjectTemplate {
  code: string;
  name: string;
  type: string;
  status: string;
  landCode?: string;
  location: string;
  district: string;
  upazila: string;
  address: string;
  startDate: Date;
  expectedCompletionDate: Date;
  estimatedBudgetPaisa: bigint;
  costCenterCode: string;
  costCenterName: string;
  description: string;
}

const DEMO_PROJECT_TEMPLATES: DemoProjectTemplate[] = [
  {
    code: 'PRJ-PUR-001',
    name: 'পূর্বাচল গ্রীন সিটি ফেজ ১ (Purbachal Green City Phase 1)',
    type: 'LAND_DEVELOPMENT',
    status: 'UNDER_CONSTRUCTION',
    landCode: 'LND-PUR-001',
    location: 'Sector 4, Purbachal New Town',
    district: 'Gazipur',
    upazila: 'Kaliganj',
    address: 'Plot 12-15, Sector 4, Purbachal Express Highway, Kaliganj, Gazipur',
    startDate: new Date('2024-01-01T00:00:00Z'),
    expectedCompletionDate: new Date('2027-12-31T00:00:00Z'),
    estimatedBudgetPaisa: 25000000000n, // 25 Crore BDT
    costCenterCode: 'CC-PUR-001',
    costCenterName: 'পূর্বাচল গ্রীন সিটি কস্ট সেন্টার',
    description:
      'Premier eco-planned gated community project spanning master land parcel LND-PUR-001',
  },
  {
    code: 'PRJ-BRV-002',
    name: 'বসুন্ধরা রিভারভিউ হাইটস (Bashundhara Riverview Heights)',
    type: 'RESIDENTIAL',
    status: 'PLANNING',
    landCode: 'LND-BRV-002',
    location: 'Block B, Riverview Project',
    district: 'Dhaka',
    upazila: 'Keraniganj',
    address: 'Road 5, Block B, Bashundhara Riverview, Hasnabad, Keraniganj, Dhaka',
    startDate: new Date('2024-06-01T00:00:00Z'),
    expectedCompletionDate: new Date('2028-06-30T00:00:00Z'),
    estimatedBudgetPaisa: 60000000000n, // 60 Crore BDT
    costCenterCode: 'CC-BRV-002',
    costCenterName: 'বসুন্ধরা রিভারভিউ কস্ট সেন্টার',
    description: 'Luxury 24-storey residential twin-tower overlooking Buriganga riverfront',
  },
];

@Injectable()
export class DemoProjectStep implements DemoSeedStep {
  private readonly logger = new Logger(DemoProjectStep.name);
  readonly name = 'DemoProjectStep';
  readonly order = 30;

  async execute(ctx: DemoSeedContext, tx: Prisma.TransactionClient): Promise<void> {
    for (const template of DEMO_PROJECT_TEMPLATES) {
      let landId: string | null = null;
      if (template.landCode) {
        landId = (ctx.state.get(`land:${template.landCode}`) as string) || null;
        if (!landId) {
          const land = await tx.land.findFirst({
            where: { companyId: ctx.companyId, code: template.landCode, deletedAt: null },
            select: { id: true },
          });
          landId = land?.id ?? null;
        }
      }

      const existingProject = await tx.project.findFirst({
        where: { companyId: ctx.companyId, code: template.code, deletedAt: null },
      });

      const projectData = {
        name: template.name,
        type: template.type,
        status: template.status,
        landId,
        location: template.location,
        district: template.district,
        upazila: template.upazila,
        address: template.address,
        startDate: template.startDate,
        expectedCompletionDate: template.expectedCompletionDate,
        estimatedBudgetPaisa: template.estimatedBudgetPaisa,
        description: template.description,
      };

      let projectId: string;
      if (existingProject) {
        await tx.project.update({
          where: { id: existingProject.id },
          data: projectData,
        });
        projectId = existingProject.id;
      } else {
        const created = await tx.project.create({
          data: {
            companyId: ctx.companyId,
            code: template.code,
            ...projectData,
          },
        });
        projectId = created.id;
      }

      // Upsert linked Cost Center
      const existingCC = await tx.costCenter.findFirst({
        where: { companyId: ctx.companyId, code: template.costCenterCode, deletedAt: null },
      });

      const ccData = {
        projectId,
        name: template.costCenterName,
        description: `Cost center for project ${template.name}`,
        isActive: true,
      };

      let costCenterId: string;
      if (existingCC) {
        await tx.costCenter.update({
          where: { id: existingCC.id },
          data: ccData,
        });
        costCenterId = existingCC.id;
      } else {
        const createdCC = await tx.costCenter.create({
          data: {
            companyId: ctx.companyId,
            code: template.costCenterCode,
            ...ccData,
          },
        });
        costCenterId = createdCC.id;
      }

      ctx.state.set(`project:${template.code}`, projectId);
      ctx.state.set(`costCenter:${template.costCenterCode}`, costCenterId);
      this.logger.log(
        `Seeded demo project ${template.code} and cost center ${template.costCenterCode}`,
      );
    }
  }
}
