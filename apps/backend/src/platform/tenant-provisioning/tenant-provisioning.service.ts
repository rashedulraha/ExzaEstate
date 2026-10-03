import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import crypto from 'node:crypto';
import { TenantDb } from '../../database/tenant-db.service.js';
import { SystemPrisma } from '../../database/system-prisma.service.js';
import {
  ProvisionCompanyDto,
  ProvisioningContext,
  ProvisioningResult,
  ProvisioningStep,
} from './provisioning-step.interface.js';
import { CompanyBranchStep } from './steps/company-branch.step.js';
import { RolesPermissionsStep } from './steps/roles-permissions.step.js';
import { ManagingDirectorStep } from './steps/managing-director.step.js';
import { DefaultDepartmentsStep } from './steps/default-departments.step.js';
import { DefaultSettingsStep } from './steps/default-settings.step.js';
import { DefaultNumberingStep } from './steps/default-numbering.step.js';

export * from './provisioning-step.interface.js';

@Injectable()
export class TenantProvisioningService implements OnModuleInit {
  private readonly logger = new Logger(TenantProvisioningService.name);
  private readonly steps: ProvisioningStep[] = [];

  constructor(
    private readonly tenantDb: TenantDb,
    private readonly systemPrisma: SystemPrisma,
    private readonly companyBranchStep: CompanyBranchStep,
    private readonly rolesPermissionsStep: RolesPermissionsStep,
    private readonly managingDirectorStep: ManagingDirectorStep,
    private readonly defaultDepartmentsStep: DefaultDepartmentsStep,
    private readonly defaultSettingsStep: DefaultSettingsStep,
    private readonly defaultNumberingStep: DefaultNumberingStep,
  ) {
    this.registerStep(this.companyBranchStep);
    this.registerStep(this.rolesPermissionsStep);
    this.registerStep(this.defaultDepartmentsStep);
    this.registerStep(this.managingDirectorStep);
    this.registerStep(this.defaultSettingsStep);
    this.registerStep(this.defaultNumberingStep);
  }

  onModuleInit(): void {
    // Re-verify registration of built-in steps on Nest lifecycle
    this.registerStep(this.companyBranchStep);
    this.registerStep(this.rolesPermissionsStep);
    this.registerStep(this.defaultDepartmentsStep);
    this.registerStep(this.managingDirectorStep);
    this.registerStep(this.defaultSettingsStep);
    this.registerStep(this.defaultNumberingStep);
  }

  /**
   * Registers a new ProvisioningStep into the pipeline.
   * Steps are maintained sorted by ascending order.
   */
  registerStep(step: ProvisioningStep): void {
    const existingIndex = this.steps.findIndex((s) => s.name === step.name);
    if (existingIndex >= 0) {
      this.steps[existingIndex] = step;
    } else {
      this.steps.push(step);
    }
    this.steps.sort((a, b) => a.order - b.order);
  }

  /**
   * Returns all currently registered provisioning steps.
   */
  getRegisteredSteps(): readonly ProvisioningStep[] {
    return [...this.steps];
  }

  /**
   * Executes company provisioning in one transaction.
   * Runs all registered steps in declared order. Any failing step rolls back everything.
   */
  async provisionCompany(dto: ProvisionCompanyDto): Promise<ProvisioningResult> {
    const companyCode = dto.code.trim().toUpperCase();

    let companyId = dto.companyId;
    if (!companyId) {
      const existing = await this.systemPrisma.executeWithReason(
        '// SYSTEM-SCOPE: Check existing company by code for idempotent provisioning',
        async (client) => {
          return client.company.findUnique({ where: { code: companyCode } });
        },
      );
      if (existing) {
        companyId = existing.id;
      } else {
        companyId = crypto.randomUUID();
      }
    }

    const ctx: ProvisioningContext = {
      companyId,
      companyCode,
      companyName: dto.name.trim(),
      timezone: dto.timezone || 'Asia/Dhaka',
      branchName: dto.branchName,
      branchCode: dto.branchCode,
      managingDirector: { ...dto.managingDirector },
      state: new Map<string, unknown>(),
    };

    this.logger.log(
      `Starting tenant provisioning for company "${ctx.companyName}" (${ctx.companyCode})`,
    );

    await this.tenantDb.withCompany(companyId, async (tx) => {
      for (const step of this.steps) {
        this.logger.debug(`Executing provisioning step: ${step.name} (order: ${step.order})`);
        await step.execute(ctx, tx as unknown as import('@prisma/client').Prisma.TransactionClient);
      }
    });

    this.logger.log(`Tenant provisioning succeeded for company ${ctx.companyId}`);

    return {
      companyId: ctx.companyId,
      companyCode: ctx.companyCode,
      branchId: (ctx.branchId || ctx.state.get('headOfficeBranchId')) as string,
      managingDirectorUserId: (ctx.managingDirector.id ||
        ctx.state.get('managingDirectorUserId')) as string,
      invitationToken: ctx.state.get('invitationToken') as string | undefined,
    };
  }
}
