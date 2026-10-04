import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProvisioningContext, ProvisioningStep } from '../provisioning-step.interface.js';
import { DEFAULT_POSTING_RULES } from './default-posting-rules.data.js';

@Injectable()
export class DefaultPostingRulesStep implements ProvisioningStep {
  readonly name = 'DefaultPostingRulesStep';
  readonly order = 90;
  private readonly logger = new Logger(DefaultPostingRulesStep.name);

  async execute(ctx: ProvisioningContext, tx: Prisma.TransactionClient): Promise<void> {
    for (const rule of DEFAULT_POSTING_RULES) {
      await tx.postingRule.upsert({
        where: {
          companyId_eventType: {
            companyId: ctx.companyId,
            eventType: rule.eventType,
          },
        },
        update: {
          ruleName: rule.ruleName,
          description: rule.description,
          debitAccountCode: rule.debitAccountCode,
          creditAccountCode: rule.creditAccountCode,
          accountMappings: rule.accountMappings,
          isActive: true,
        },
        create: {
          companyId: ctx.companyId,
          eventType: rule.eventType,
          ruleName: rule.ruleName,
          description: rule.description,
          debitAccountCode: rule.debitAccountCode,
          creditAccountCode: rule.creditAccountCode,
          accountMappings: rule.accountMappings,
          isActive: true,
        },
      });
    }

    this.logger.debug(
      `Provisioned ${DEFAULT_POSTING_RULES.length} default posting rules for company ${ctx.companyCode}`,
    );
  }
}
