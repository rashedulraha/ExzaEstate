import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DEFAULT_APPROVAL_RULES } from './default-approval-rules.data.js';
import { ProvisioningContext, ProvisioningStep } from '../provisioning-step.interface.js';

@Injectable()
export class DefaultApprovalRulesStep implements ProvisioningStep {
  readonly name = 'DefaultApprovalRulesStep';
  readonly order = 45;
  private readonly logger = new Logger(DefaultApprovalRulesStep.name);

  async execute(ctx: ProvisioningContext, tx: Prisma.TransactionClient): Promise<void> {
    const rules = DEFAULT_APPROVAL_RULES;

    for (const r of rules) {
      const existing = await tx.approvalRule.findFirst({
        where: {
          companyId: ctx.companyId,
          type: r.type,
          name: r.name,
          deletedAt: null,
        },
      });

      if (!existing) {
        await tx.approvalRule.create({
          data: {
            companyId: ctx.companyId,
            type: r.type,
            name: r.name,
            description: r.description,
            minPercentage: r.minPercentage ? new Prisma.Decimal(r.minPercentage) : null,
            maxPercentage: r.maxPercentage ? new Prisma.Decimal(r.maxPercentage) : null,
            minAmountPaisa: r.minAmountPaisa ?? 0n,
            maxAmountPaisa: r.maxAmountPaisa ?? null,
            requiredPermission: r.requiredPermission,
            stepOrder: r.stepOrder,
            slaHours: r.slaHours,
            isActive: true,
          },
        });
      }
    }

    this.logger.log(
      `Provisioned ${rules.length} default approval rules for company ${ctx.companyCode}`,
    );
  }
}
