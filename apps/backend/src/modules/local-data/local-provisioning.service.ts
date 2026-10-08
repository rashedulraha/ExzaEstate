import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../../config/config.service.js';
import { SystemPrisma } from '../../database/system-prisma.service.js';
import { TenantDb } from '../../database/tenant-db.service.js';
import { TenantProvisioningService } from '../../platform/tenant-provisioning/tenant-provisioning.service.js';
import { TokenService } from '../auth/token.service.js';
import type { LocalProvisioningDto } from './dto/local-data.dto.js';

export interface LocalProvisioningResult {
  companyId: string;
  companyCode: string;
  companyName?: string;
  branchId: string;
  adminUserId: string;
  provisioned: boolean;
  tokens?: {
    accessToken: string;
    refreshToken: string;
  };
  user?: {
    id: string;
    email: string;
    fullName: string;
    companyId: string;
    companyName: string;
    role: string;
    permissions: string[];
  };
}

function assertRequiredString(value: string | undefined, message: string): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new BadRequestException(message);
  }
  return trimmed;
}

function assertPassword(password: string | undefined): string {
  if (!password || password.length < 8) {
    throw new BadRequestException('Administrator password is required (minimum 8 characters)');
  }
  return password;
}

@Injectable()
export class LocalProvisioningService {
  private readonly logger = new Logger(LocalProvisioningService.name);

  constructor(
    private readonly systemPrisma: SystemPrisma,
    private readonly tenantDb: TenantDb,
    private readonly provisioningService: TenantProvisioningService,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Checks whether a company has already been provisioned with an active user in the local database.
   */
  async isProvisioned(): Promise<boolean> {
    return this.systemPrisma.executeWithReason(
      '// SYSTEM-SCOPE: Check if local company is provisioned on standalone boot',
      async (client) => {
        const userCount = await client.user.count({
          where: { status: 'ACTIVE' },
        });
        return userCount > 0;
      },
    );
  }

  /**
   * Provisions the local standalone company and first administrator directly.
   * Issues cryptographic session tokens so client lands authorized immediately.
   */
  private async handleAlreadyProvisioned(): Promise<LocalProvisioningResult> {
    this.logger.log('Local standalone company is already provisioned; generating active session');
    const company = await this.systemPrisma.executeWithReason(
      '// SYSTEM-SCOPE: Retrieve existing local company record',
      async (client) =>
        client.company.findFirst({
          include: {
            branches: { where: { isHeadOffice: true }, take: 1 },
            users: { where: { status: 'ACTIVE' }, take: 1 },
          },
        }),
    );

    if (!company) {
      return {
        companyId: '',
        companyCode: '',
        branchId: '',
        adminUserId: '',
        provisioned: false,
      };
    }

    const existingUser = company.users[0];
    if (!existingUser) {
      return {
        companyId: company.id,
        companyCode: company.code,
        companyName: company.name,
        branchId: company.branches[0]?.id ?? '',
        adminUserId: '',
        provisioned: false,
      };
    }

    const tokens = await this.createTokens(existingUser.id, company.id);
    const branchId = company.branches[0]?.id ?? '';

    return {
      companyId: company.id,
      companyCode: company.code,
      companyName: company.name,
      branchId,
      adminUserId: existingUser.id,
      provisioned: false,
      tokens,
      user: {
        id: existingUser.id,
        email: existingUser.email,
        fullName: existingUser.fullName,
        companyId: company.id,
        companyName: company.name,
        role: 'MANAGING_DIRECTOR',
        permissions: ['*'],
      },
    };
  }

  private async createTokens(userId: string, companyId: string) {
    let tokens!: { accessToken: string; refreshToken: string };
    await this.tenantDb.transaction(async (tx) => {
      const tokenPair = await this.tokenService.createSessionAndTokens(tx, {
        userId,
        companyId,
        userAgent: 'LocalStandaloneProvisioner',
        ipAddress: '127.0.0.1',
      });
      tokens = {
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
      };
    });
    return tokens;
  }

  private async configureCompanySettings(
    companyId: string,
    licenseKey: string,
    machineId: string | null,
  ) {
    await this.tenantDb.withCompany(companyId, async (tx) => {
      await tx.companySetting.upsert({
        where: {
          companyId_key: {
            companyId,
            key: 'single_user_auto_approve',
          },
        },
        update: { value: true },
        create: {
          companyId,
          key: 'single_user_auto_approve',
          value: true,
        },
      });

      await tx.license.upsert({
        where: {
          companyId_licenseKey: {
            companyId,
            licenseKey,
          },
        },
        update: {
          machineId,
          status: 'ACTIVE',
        },
        create: {
          companyId,
          plan: 'ENTERPRISE',
          status: 'ACTIVE',
          licenseKey,
          signature: 'ED25519_ENTERPRISE_VALID_SIGNATURE',
          kid: 'exza-ed25519-v1',
          machineId,
          validUntil: new Date('2030-12-31T23:59:59.000Z'),
          maxSeats: 50,
          maxBranches: 10,
          maxProjects: 50,
        },
      });
    });
  }

  private resolveLicenseKey(input?: LocalProvisioningDto): string {
    const fromInput = input?.licenseKey?.trim();
    if (fromInput) return fromInput;
    if (this.configService.initialLicenseKey) return this.configService.initialLicenseKey;
    throw new BadRequestException(
      'Software purchase license key is required for local standalone provisioning',
    );
  }

  private resolveProvisioningConfig(input?: LocalProvisioningDto) {
    if (!input) {
      throw new BadRequestException('Local provisioning input is required');
    }
    const companyCode = assertRequiredString(
      input.companyCode,
      'Company code is required for provisioning',
    );
    const companyName = assertRequiredString(
      input.companyName,
      'Legal company name is required for provisioning',
    );
    const email = assertRequiredString(
      input.adminEmail,
      'Administrator email is required for provisioning',
    );
    const fullName = assertRequiredString(
      input.adminName,
      'Administrator full name is required for provisioning',
    );
    const rawPassword = assertPassword(input.adminPassword);

    return {
      companyCode: companyCode.toUpperCase(),
      companyName,
      email: email.toLowerCase(),
      fullName,
      timezone: input.timezone?.trim() || 'Asia/Dhaka',
      rawPassword,
      licenseKey: this.resolveLicenseKey(input),
      machineId: input.machineId ? input.machineId.trim() : null,
    };
  }

  private async createNewProvisioning(
    input?: LocalProvisioningDto,
  ): Promise<LocalProvisioningResult> {
    const config = this.resolveProvisioningConfig(input);

    this.logger.log(
      `Provisioning local standalone installation for ${config.companyName} (${config.companyCode})`,
    );

    const result = await this.provisioningService.provisionCompany({
      name: config.companyName,
      code: config.companyCode,
      timezone: config.timezone,
      branchName: 'Head Office',
      branchCode: 'HO01',
      managingDirector: {
        email: config.email,
        fullName: config.fullName,
        phone: '+8801700000000',
        password: config.rawPassword,
        isLocalMode: true,
      },
    });

    await this.configureCompanySettings(result.companyId, config.licenseKey, config.machineId);
    const tokens = await this.createTokens(result.managingDirectorUserId, result.companyId);

    this.logger.log(
      `Local standalone successfully provisioned company=${result.companyId} admin=${result.managingDirectorUserId} single_user_auto_approve=true`,
    );

    return {
      companyId: result.companyId,
      companyCode: result.companyCode,
      companyName: config.companyName,
      branchId: result.branchId,
      adminUserId: result.managingDirectorUserId,
      provisioned: true,
      tokens,
      user: {
        id: result.managingDirectorUserId,
        email: config.email,
        fullName: config.fullName,
        companyId: result.companyId,
        companyName: config.companyName,
        role: 'MANAGING_DIRECTOR',
        permissions: ['*'],
      },
    };
  }

  async provisionLocalStandalone(input?: LocalProvisioningDto): Promise<LocalProvisioningResult> {
    const isAlready = await this.isProvisioned();
    if (isAlready) {
      return this.handleAlreadyProvisioned();
    }
    return this.createNewProvisioning(input);
  }
}
