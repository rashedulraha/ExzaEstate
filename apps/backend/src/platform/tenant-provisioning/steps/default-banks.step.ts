import { Injectable } from '@nestjs/common';
import { SystemPrisma } from '../../../database/system-prisma.service.js';
import { DEFAULT_BANKS } from './default-banks.data.js';

@Injectable()
export class DefaultBanksStep {
  async seedGlobalBanks(systemPrisma: SystemPrisma): Promise<void> {
    await systemPrisma.executeWithReason(
      '// SYSTEM-SCOPE: Seed global banks and bank branches reference data',
      async (client) => {
        for (const bankData of DEFAULT_BANKS) {
          const bank = await client.bank.upsert({
            where: { code: bankData.code },
            update: {
              name: bankData.name,
              swiftCode: bankData.swiftCode,
              isActive: true,
            },
            create: {
              name: bankData.name,
              code: bankData.code,
              swiftCode: bankData.swiftCode,
              isActive: true,
            },
          });

          for (const branchData of bankData.branches) {
            await client.bankBranch.upsert({
              where: { routingNumber: branchData.routingNumber },
              update: {
                name: branchData.name,
                district: branchData.district,
                bankId: bank.id,
                isActive: true,
              },
              create: {
                bankId: bank.id,
                name: branchData.name,
                routingNumber: branchData.routingNumber,
                district: branchData.district,
                isActive: true,
              },
            });
          }
        }
      },
    );
  }
}
