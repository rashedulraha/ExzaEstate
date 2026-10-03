import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProvisioningContext, ProvisioningStep } from '../provisioning-step.interface.js';

@Injectable()
export class CompanyBranchStep implements ProvisioningStep {
  readonly name = 'CompanyBranchStep';
  readonly order = 10;

  async execute(ctx: ProvisioningContext, tx: Prisma.TransactionClient): Promise<void> {
    const company = await tx.company.upsert({
      where: { code: ctx.companyCode },
      update: {
        name: ctx.companyName,
        timezone: ctx.timezone,
        isActive: true,
      },
      create: {
        id: ctx.companyId,
        companyId: ctx.companyId,
        name: ctx.companyName,
        code: ctx.companyCode,
        timezone: ctx.timezone,
        isActive: true,
      },
    });

    ctx.companyId = company.id;
    ctx.state.set('companyId', company.id);

    const branchCode = ctx.branchCode || 'HO';
    const branchName = ctx.branchName || 'Head Office';

    const branch = await tx.branch.upsert({
      where: {
        companyId_code: {
          companyId: company.id,
          code: branchCode,
        },
      },
      update: {
        name: branchName,
        isHeadOffice: true,
        isActive: true,
      },
      create: {
        companyId: company.id,
        name: branchName,
        code: branchCode,
        isHeadOffice: true,
        isActive: true,
      },
    });

    ctx.branchId = branch.id;
    ctx.state.set('headOfficeBranchId', branch.id);
  }
}
