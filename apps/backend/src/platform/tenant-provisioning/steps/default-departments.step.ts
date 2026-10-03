import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProvisioningContext, ProvisioningStep } from '../provisioning-step.interface.js';

export const BASELINE_DEPARTMENTS = [
  { code: 'ADMIN', name: 'Administration' },
  { code: 'SALES', name: 'Sales & Marketing' },
  { code: 'ACCOUNTS', name: 'Accounts & Finance' },
  { code: 'ENGINEERING', name: 'Engineering & Construction' },
  { code: 'CUSTOMER_CARE', name: 'Customer Care' },
];

@Injectable()
export class DefaultDepartmentsStep implements ProvisioningStep {
  readonly name = 'DefaultDepartmentsStep';
  readonly order = 25;
  private readonly logger = new Logger(DefaultDepartmentsStep.name);

  async execute(ctx: ProvisioningContext, tx: Prisma.TransactionClient): Promise<void> {
    const branchId = (ctx.branchId || ctx.state.get('headOfficeBranchId')) as string | undefined;

    for (const dept of BASELINE_DEPARTMENTS) {
      await tx.department.upsert({
        where: {
          companyId_code: {
            companyId: ctx.companyId,
            code: dept.code,
          },
        },
        update: {
          name: dept.name,
          branchId: branchId ?? null,
          isActive: true,
          deletedAt: null,
        },
        create: {
          companyId: ctx.companyId,
          code: dept.code,
          name: dept.name,
          branchId: branchId ?? null,
          isActive: true,
        },
      });
    }

    this.logger.log(
      `Provisioned ${BASELINE_DEPARTMENTS.length} default departments for company ${ctx.companyCode}`,
    );
  }
}
