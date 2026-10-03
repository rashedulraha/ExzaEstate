import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { TenantDb } from '../../../database/tenant-db.service.js';
import {
  ProvisionCompanyDto,
  ProvisioningResult,
  TenantProvisioningService,
} from '../tenant-provisioning.service.js';
import { DemoSeedContext, DemoSeedStep } from './demo-seed-step.interface.js';
import { DemoStaffStep } from './steps/demo-staff.step.js';

export * from './demo-seed-step.interface.js';

@Injectable()
export class DemoSeedService implements OnModuleInit {
  private readonly logger = new Logger(DemoSeedService.name);
  private readonly steps: DemoSeedStep[] = [];

  constructor(
    private readonly tenantDb: TenantDb,
    private readonly provisioningService: TenantProvisioningService,
    private readonly demoStaffStep: DemoStaffStep,
  ) {
    this.registerStep(this.demoStaffStep);
  }

  onModuleInit(): void {
    this.registerStep(this.demoStaffStep);
  }

  registerStep(step: DemoSeedStep): void {
    const existingIndex = this.steps.findIndex((s) => s.name === step.name);
    if (existingIndex >= 0) {
      this.steps[existingIndex] = step;
    } else {
      this.steps.push(step);
    }
    this.steps.sort((a, b) => a.order - b.order);
  }

  getRegisteredSteps(): readonly DemoSeedStep[] {
    return [...this.steps];
  }

  async runDemoSeed(dto?: ProvisionCompanyDto): Promise<ProvisioningResult> {
    const defaultDto: ProvisionCompanyDto = {
      name: 'ExzaEstate Development Ltd. (রূপায়ণ)',
      code: 'EXZA',
      timezone: 'Asia/Dhaka',
      branchName: 'Head Office (প্রধান কার্যালয়)',
      branchCode: 'HO',
      managingDirector: {
        email: 'md@exzaestate.com',
        fullName: 'আনোয়ার হোসেন (Anwar Hossain)',
        phone: '+8801700000001',
        password: 'ExzaEstate@2026!',
        isLocalMode: true,
      },
    };

    const targetDto = dto || defaultDto;
    this.logger.log(`Running demo seed for company: ${targetDto.name} (${targetDto.code})`);

    // 1. Run baseline tenant provisioning first (idempotent)
    const baseline = await this.provisioningService.provisionCompany(targetDto);

    // 2. Run all registered DemoSeedStep implementations inside the tenant context
    const ctx: DemoSeedContext = {
      companyId: baseline.companyId,
      companyCode: baseline.companyCode,
      branchId: baseline.branchId,
      state: new Map<string, unknown>(),
    };

    await this.tenantDb.withCompany(baseline.companyId, async (tx) => {
      for (const step of this.steps) {
        this.logger.debug(`Executing demo seed step: ${step.name} (order: ${step.order})`);
        await step.execute(ctx, tx as unknown as import('@prisma/client').Prisma.TransactionClient);
      }
    });

    this.logger.log(`Demo seed completed successfully for company ${baseline.companyId}`);
    return baseline;
  }
}
