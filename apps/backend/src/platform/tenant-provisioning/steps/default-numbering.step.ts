import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DEFAULT_NUMBERING_PATTERNS } from './default-numbering.data.js';
import { ProvisioningContext, ProvisioningStep } from '../provisioning-step.interface.js';

@Injectable()
export class DefaultNumberingStep implements ProvisioningStep {
  readonly name = 'DefaultNumberingStep';
  readonly order = 50;
  private readonly logger = new Logger(DefaultNumberingStep.name);

  async execute(ctx: ProvisioningContext, tx: Prisma.TransactionClient): Promise<void> {
    const patterns = Object.values(DEFAULT_NUMBERING_PATTERNS);

    for (const p of patterns) {
      await tx.numberingPattern.upsert({
        where: {
          companyId_documentType: {
            companyId: ctx.companyId,
            documentType: p.documentType,
          },
        },
        update: {
          prefix: p.prefix,
          pattern: p.pattern,
          resetRule: p.resetRule,
          isActive: true,
        },
        create: {
          companyId: ctx.companyId,
          documentType: p.documentType,
          prefix: p.prefix,
          pattern: p.pattern,
          resetRule: p.resetRule,
          currentSequence: 0,
          isActive: true,
        },
      });
    }

    this.logger.log(
      `Provisioned ${patterns.length} default numbering patterns for company ${ctx.companyCode}`,
    );
  }
}
