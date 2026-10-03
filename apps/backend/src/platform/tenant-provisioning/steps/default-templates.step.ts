import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { DEFAULT_NOTIFICATION_TEMPLATES } from './default-templates.data.js';
import type { ProvisioningContext, ProvisioningStep } from '../provisioning-step.interface.js';

@Injectable()
export class DefaultTemplatesStep implements ProvisioningStep {
  readonly name = 'DefaultTemplatesStep';
  readonly order = 55;
  private readonly logger = new Logger(DefaultTemplatesStep.name);

  async execute(ctx: ProvisioningContext, tx: Prisma.TransactionClient): Promise<void> {
    for (const tpl of DEFAULT_NOTIFICATION_TEMPLATES) {
      await tx.notificationTemplate.upsert({
        where: {
          companyId_eventCode_channel: {
            companyId: ctx.companyId,
            eventCode: tpl.eventCode,
            channel: tpl.channel,
          },
        },
        update: {
          title: tpl.title,
          body: tpl.body,
          isActive: true,
        },
        create: {
          companyId: ctx.companyId,
          eventCode: tpl.eventCode,
          channel: tpl.channel,
          title: tpl.title,
          body: tpl.body,
          isActive: true,
        },
      });
    }

    this.logger.log(
      `Provisioned ${DEFAULT_NOTIFICATION_TEMPLATES.length} default notification templates for company ${ctx.companyCode}`,
    );
  }
}
