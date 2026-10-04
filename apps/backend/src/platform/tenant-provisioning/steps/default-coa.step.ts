import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProvisioningContext, ProvisioningStep } from '../provisioning-step.interface.js';
import { DEFAULT_CHART_OF_ACCOUNTS } from './default-coa.data.js';

@Injectable()
export class DefaultCoaStep implements ProvisioningStep {
  readonly name = 'DefaultCoaStep';
  readonly order = 80;
  private readonly logger = new Logger(DefaultCoaStep.name);

  async execute(ctx: ProvisioningContext, tx: Prisma.TransactionClient): Promise<void> {
    const parentAccounts = DEFAULT_CHART_OF_ACCOUNTS.filter((acc) => acc.parentCode === null);
    const childAccounts = DEFAULT_CHART_OF_ACCOUNTS.filter((acc) => acc.parentCode !== null);

    const accountIdByCode = new Map<string, string>();

    // 1. Upsert root/group accounts first
    for (const acc of parentAccounts) {
      const record = await tx.account.upsert({
        where: {
          companyId_code: {
            companyId: ctx.companyId,
            code: acc.code,
          },
        },
        update: {
          name: acc.name,
          type: acc.type,
          isGroup: acc.isGroup,
          isSystem: acc.isSystem,
          partyType: acc.partyType ?? null,
          description: acc.description,
          isActive: true,
        },
        create: {
          companyId: ctx.companyId,
          code: acc.code,
          name: acc.name,
          type: acc.type,
          isGroup: acc.isGroup,
          isSystem: acc.isSystem,
          partyType: acc.partyType ?? null,
          description: acc.description,
          isActive: true,
        },
      });
      accountIdByCode.set(acc.code, record.id);
    }

    // 2. Upsert child accounts with resolved parent IDs
    for (const acc of childAccounts) {
      const parentId = acc.parentCode ? (accountIdByCode.get(acc.parentCode) ?? null) : null;

      const record = await tx.account.upsert({
        where: {
          companyId_code: {
            companyId: ctx.companyId,
            code: acc.code,
          },
        },
        update: {
          name: acc.name,
          type: acc.type,
          parentId,
          isGroup: acc.isGroup,
          isSystem: acc.isSystem,
          partyType: acc.partyType ?? null,
          description: acc.description,
          isActive: true,
        },
        create: {
          companyId: ctx.companyId,
          code: acc.code,
          name: acc.name,
          type: acc.type,
          parentId,
          isGroup: acc.isGroup,
          isSystem: acc.isSystem,
          partyType: acc.partyType ?? null,
          description: acc.description,
          isActive: true,
        },
      });
      accountIdByCode.set(acc.code, record.id);
    }

    this.logger.log(
      `Provisioned ${DEFAULT_CHART_OF_ACCOUNTS.length} chart of accounts for company ${ctx.companyCode}`,
    );
  }
}
