import { Injectable } from '@nestjs/common';
import { NotFoundException, ValidationException } from '../../common/exceptions/app.exception.js';
import { ConfigService } from '../../config/config.service.js';
import { TenantDb } from '../../database/tenant-db.service.js';
import { PermissionService } from './permission.service.js';
import { CryptoUtil } from './utils/crypto.util.js';
import { TotpUtil } from './utils/totp.util.js';

@Injectable()
export class TwoFactorService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly configService: ConfigService,
    private readonly permissionService: PermissionService,
  ) {}

  async generate(userId: string, companyId: string): Promise<{ secret: string; uri: string }> {
    const user = await this.tenantDb.withCompany(companyId, async (tx) => {
      return tx.user.findUnique({
        where: { id: userId, companyId },
        select: { email: true },
      });
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const secret = TotpUtil.generateSecret();
    const uri = TotpUtil.generateUri(user.email, secret);

    return { secret, uri };
  }

  async enable(
    userId: string,
    companyId: string,
    secret: string,
    token: string,
  ): Promise<{ recoveryCodes: string[] }> {
    const isValid = TotpUtil.verifyToken(secret, token);
    if (!isValid) {
      throw new ValidationException('Invalid TOTP verification code');
    }

    const plaintextCodes = TotpUtil.generateRecoveryCodes(10);
    const hashedCodes = plaintextCodes.map((code) => TotpUtil.hashRecoveryCode(code));

    const encryptionKey = this.configService.jwt.accessSecret;
    const encryptedSecret = CryptoUtil.encrypt(secret, encryptionKey);

    await this.tenantDb.withCompany(companyId, async (tx) => {
      await tx.user.update({
        where: { id: userId, companyId },
        data: {
          isTwoFactorEnabled: true,
          twoFactorSecret: encryptedSecret,
          twoFactorRecoveryCodes: hashedCodes,
          twoFactorEnrolledAt: new Date(),
        },
      });
    });

    await this.permissionService.invalidateUserPermissions(companyId, userId);

    return { recoveryCodes: plaintextCodes };
  }

  async disable(userId: string, companyId: string, token: string): Promise<{ message: string }> {
    const user = await this.tenantDb.withCompany(companyId, async (tx) => {
      return tx.user.findUnique({
        where: { id: userId, companyId },
        select: {
          isTwoFactorEnabled: true,
          twoFactorSecret: true,
          twoFactorRecoveryCodes: true,
        },
      });
    });

    if (!user || !user.isTwoFactorEnabled || !user.twoFactorSecret) {
      throw new ValidationException('Two-factor authentication is not enabled');
    }

    const encryptionKey = this.configService.jwt.accessSecret;
    const decryptedSecret = CryptoUtil.decrypt(user.twoFactorSecret, encryptionKey);

    const isTotpValid = TotpUtil.verifyToken(decryptedSecret, token);
    const hashedInput = TotpUtil.hashRecoveryCode(token);
    const isRecoveryValid = user.twoFactorRecoveryCodes.includes(hashedInput);

    if (!isTotpValid && !isRecoveryValid) {
      throw new ValidationException('Invalid TOTP code or recovery code');
    }

    await this.tenantDb.withCompany(companyId, async (tx) => {
      await tx.user.update({
        where: { id: userId, companyId },
        data: {
          isTwoFactorEnabled: false,
          twoFactorSecret: null,
          twoFactorRecoveryCodes: [],
          twoFactorEnrolledAt: null,
        },
      });
    });

    await this.permissionService.invalidateUserPermissions(companyId, userId);

    return { message: 'Two-factor authentication disabled' };
  }

  async verifyStepUp(
    userId: string,
    companyId: string,
    sessionId: string,
    token: string,
  ): Promise<{ stepUpUntil: Date }> {
    const user = await this.tenantDb.withCompany(companyId, async (tx) => {
      return tx.user.findUnique({
        where: { id: userId, companyId },
        select: {
          isTwoFactorEnabled: true,
          twoFactorSecret: true,
          twoFactorRecoveryCodes: true,
        },
      });
    });

    if (!user || !user.isTwoFactorEnabled || !user.twoFactorSecret) {
      throw new ValidationException('Two-factor authentication must be enabled for step-up');
    }

    const encryptionKey = this.configService.jwt.accessSecret;
    const decryptedSecret = CryptoUtil.decrypt(user.twoFactorSecret, encryptionKey);

    const isTotpValid = TotpUtil.verifyToken(decryptedSecret, token);
    const hashedInput = TotpUtil.hashRecoveryCode(token);
    const isRecoveryValid = user.twoFactorRecoveryCodes.includes(hashedInput);

    if (!isTotpValid && !isRecoveryValid) {
      throw new ValidationException('Invalid TOTP verification code');
    }

    const stepUpUntil = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes valid

    await this.tenantDb.withCompany(companyId, async (tx) => {
      await tx.session.update({
        where: { id: sessionId, companyId },
        data: { stepUpUntil },
      });
    });

    return { stepUpUntil };
  }
}
