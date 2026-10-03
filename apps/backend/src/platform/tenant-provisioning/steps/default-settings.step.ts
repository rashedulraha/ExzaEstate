import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DEFAULT_COMPANY_SETTINGS } from './default-settings.data.js';
import { ProvisioningContext, ProvisioningStep } from '../provisioning-step.interface.js';

@Injectable()
export class DefaultSettingsStep implements ProvisioningStep {
  readonly name = 'DefaultSettingsStep';
  readonly order = 40;
  private readonly logger = new Logger(DefaultSettingsStep.name);

  async execute(ctx: ProvisioningContext, tx: Prisma.TransactionClient): Promise<void> {
    const entries = DEFAULT_COMPANY_SETTINGS;

    for (const entry of entries) {
      await tx.companySetting.upsert({
        where: {
          companyId_key: {
            companyId: ctx.companyId,
            key: entry.key,
          },
        },
        update: {
          value: entry.defaultValue as Prisma.InputJsonValue,
        },
        create: {
          companyId: ctx.companyId,
          key: entry.key,
          value: entry.defaultValue as Prisma.InputJsonValue,
        },
      });
    }

    this.logger.log(
      `Provisioned ${entries.length} default configuration settings for company ${ctx.companyCode}`,
    );
  }
}
