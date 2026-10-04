import { Injectable, Logger } from '@nestjs/common';
import { SystemPrisma } from '../../database/system-prisma.service.js';
import { TenantDb } from '../../database/tenant-db.service.js';
import { TenantProvisioningService } from '../../platform/tenant-provisioning/tenant-provisioning.service.js';
import type { LocalProvisioningDto } from './dto/local-data.dto.js';

export interface LocalProvisioningResult {
  companyId: string;
  companyCode: string;
  branchId: string;
  adminUserId: string;
  provisioned: boolean;
}

@Injectable()
export class LocalProvisioningService {
  private readonly logger = new Logger(LocalProvisioningService.name);

  constructor(
    private readonly systemPrisma: SystemPrisma,
    private readonly tenantDb: TenantDb,
    private readonly provisioningService: TenantProvisioningService,
  ) {}

  /**
   * Checks whether a company has already been provisioned in the local database.
   */
  async isProvisioned(): Promise<boolean> {
    return this.systemPrisma.executeWithReason(
      '// SYSTEM-SCOPE: Check if local company is provisioned on standalone boot',
      async (client) => {
        const count = await client.company.count();
        return count > 0;
      },
    );
  }

  /**
   * Provisions the local standalone company and first administrator directly.
   * Enforces single_user_auto_approve=true in company settings (Task A10.1 S3).
   */
  async provisionLocalStandalone(input?: LocalProvisioningDto): Promise<LocalProvisioningResult> {
    const isAlready = await this.isProvisioned();
    if (isAlready) {
      this.logger.log('Local standalone company is already provisioned; skipping initial provisioning');
      const company = await this.systemPrisma.executeWithReason(
        '// SYSTEM-SCOPE: Retrieve existing local company record',
        async (client) =>
          client.company.findFirst({
            include: {
              branches: { where: { isHeadOffice: true }, take: 1 },
              users: { take: 1 },
            },
          }),
      );

      return {
        companyId: company?.id ?? '',
        companyCode: company?.code ?? '',
        branchId: company?.branches[0]?.id ?? '',
        adminUserId: company?.users[0]?.id ?? '',
        provisioned: false,
      };
    }

    const companyCode = (input?.companyCode || 'LOCAL01').toUpperCase().trim();
    const companyName = input?.companyName || 'ExzaEstate Standalone';
    const email = (input?.adminEmail || 'admin@local.exzaestate.internal').toLowerCase().trim();
    const fullName = input?.adminName || 'System Administrator';
    const timezone = input?.timezone || 'Asia/Dhaka';

    this.logger.log(`Provisioning local standalone installation for ${companyName} (${companyCode})`);

    const result = await this.provisioningService.provisionCompany({
      name: companyName,
      code: companyCode,
      timezone,
      branchName: 'Head Office',
      branchCode: 'HO01',
      managingDirector: {
        email,
        fullName,
        phone: '+8801700000000',
        password: input?.adminPassword || 'AdminLocal1234!',
        isLocalMode: true,
      },
    });

    // Enforce single_user_auto_approve = true for local single-user operations
    await this.tenantDb.withCompany(result.companyId, async (tx) => {
      await tx.companySetting.upsert({
        where: {
          companyId_key: {
            companyId: result.companyId,
            key: 'single_user_auto_approve',
          },
        },
        update: {
          value: true,
        },
        create: {
          companyId: result.companyId,
          key: 'single_user_auto_approve',
          value: true,
        },
      });
    });

    this.logger.log(
      `Local standalone successfully provisioned company=${result.companyId} admin=${result.managingDirectorUserId} single_user_auto_approve=true`,
    );

    return {
      companyId: result.companyId,
      companyCode: result.companyCode,
      branchId: result.branchId,
      adminUserId: result.managingDirectorUserId,
      provisioned: true,
    };
  }
}
