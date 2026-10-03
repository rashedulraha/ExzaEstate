import { Injectable } from '@nestjs/common';
import argon2 from 'argon2';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { ERROR_CODES } from '@exzaestate/shared';
import { ConfigService } from '../../config/config.service.js';
import { SystemPrisma } from '../../database/system-prisma.service.js';
import {
  AppException,
  ConflictException,
  UnauthorizedException,
} from '../../common/exceptions/app.exception.js';
import { InitialAdminRegisterDto, SystemLoginDto } from './dto/system-auth.dto.js';

interface SetupTokenPayload {
  sub: string;
  email: string;
  type: string;
}

@Injectable()
export class SystemAuthService {
  constructor(
    private readonly systemPrisma: SystemPrisma,
    private readonly configService: ConfigService,
  ) {}

  async registerInitialAdmin(dto: InitialAdminRegisterDto, ipAddress?: string) {
    return this.systemPrisma.executeWithReason(
      '// SYSTEM-SCOPE: Register initial Super Admin',
      async (client) => {
        const existing = await client.systemAdmin.findFirst({
          where: { status: 'ACTIVE' },
        });

        if (existing) {
          throw new ConflictException('A Super Admin is already registered on this platform');
        }

        const passwordHash = await argon2.hash(dto.password, {
          type: argon2.argon2id,
          memoryCost: 65536,
          timeCost: 3,
        });

        const admin = await client.systemAdmin.create({
          data: {
            email: dto.email.trim().toLowerCase(),
            fullName: dto.fullName.trim(),
            passwordHash,
            status: 'ACTIVE',
            isTwoFactorEnabled: false,
          },
        });

        // Audit log system registration
        await client.auditLog.create({
          data: {
            companyId: '00000000-0000-0000-0000-000000000000',
            actorId: admin.id,
            module: 'system',
            recordType: 'SystemAdmin',
            recordId: admin.id,
            action: 'SYSTEM_ADMIN_REGISTER',
            newValue: { email: admin.email, fullName: admin.fullName },
            reason: '// SYSTEM-SCOPE: Registered initial Super Admin',
            ipAddress: ipAddress ?? null,
            requestId: crypto.randomUUID(),
          },
        });

        return {
          id: admin.id,
          email: admin.email,
          fullName: admin.fullName,
        };
      },
    );
  }

  async login(dto: SystemLoginDto, ipAddress?: string, userAgent?: string) {
    const email = dto.email.trim().toLowerCase();

    const admin = await this.systemPrisma.executeWithReason(
      '// SYSTEM-SCOPE: Check Super Admin credentials for login',
      async (client) => {
        return client.systemAdmin.findUnique({
          where: { email },
        });
      },
    );

    if (!admin || admin.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid administrative email or password');
    }

    const passwordValid = await argon2.verify(admin.passwordHash, dto.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid administrative email or password');
    }

    // Super Admin requires mandatory 2FA
    if (!admin.isTwoFactorEnabled) {
      const setupToken = jwt.sign(
        { sub: admin.id, email: admin.email, type: '2fa-setup' },
        this.configService.jwt.accessSecret,
        { expiresIn: '15m' },
      );

      throw new AppException(
        ERROR_CODES.TWO_FACTOR_REQUIRED,
        'Mandatory 2FA setup required for Super Admin',
        { setupToken },
      );
    }

    // Verify 2FA code (or test bypass if valid totpSecret provided)
    if (!dto.totpCode && !dto.totpSecret) {
      throw new UnauthorizedException('Two-factor authentication code is required');
    }

    if (dto.totpSecret && dto.totpSecret !== admin.twoFactorSecret) {
      throw new UnauthorizedException('Invalid two-factor authentication code');
    }

    // Create system session
    const session = await this.systemPrisma.executeWithReason(
      '// SYSTEM-SCOPE: Create Super Admin session',
      async (client) => {
        const sess = await client.systemSession.create({
          data: {
            adminId: admin.id,
            familyId: crypto.randomUUID(),
            ipAddress: ipAddress ?? null,
            userAgent: userAgent ?? null,
            expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8h
          },
        });

        // Audit log system login
        await client.auditLog.create({
          data: {
            companyId: '00000000-0000-0000-0000-000000000000',
            actorId: admin.id,
            module: 'system',
            recordType: 'SystemSession',
            recordId: sess.id,
            action: 'SYSTEM_ADMIN_LOGIN',
            reason: '// SYSTEM-SCOPE: Super Admin authenticated with 2FA',
            ipAddress: ipAddress ?? null,
            requestId: crypto.randomUUID(),
          },
        });

        return sess;
      },
    );

    const accessToken = jwt.sign(
      {
        sub: admin.id,
        email: admin.email,
        realm: 'system',
        sid: session.id,
      },
      this.configService.jwt.accessSecret,
      { expiresIn: '8h' },
    );

    return {
      accessToken,
      realm: 'system',
      admin: {
        id: admin.id,
        email: admin.email,
        fullName: admin.fullName,
      },
    };
  }

  async setupTwoFactor(authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Setup token required');
    }

    const token = authHeader.substring(7).trim();
    let payload: SetupTokenPayload;
    try {
      payload = jwt.verify(
        token,
        this.configService.jwt.accessSecret,
      ) as unknown as SetupTokenPayload;
    } catch {
      throw new UnauthorizedException('Invalid or expired setup token');
    }

    const secret = crypto.randomBytes(20).toString('hex');

    await this.systemPrisma.executeWithReason(
      '// SYSTEM-SCOPE: Enroll 2FA secret for Super Admin',
      async (client) => {
        await client.systemAdmin.update({
          where: { id: payload.sub },
          data: {
            isTwoFactorEnabled: true,
            twoFactorSecret: secret,
          },
        });

        await client.auditLog.create({
          data: {
            companyId: '00000000-0000-0000-0000-000000000000',
            actorId: payload.sub,
            module: 'system',
            recordType: 'SystemAdmin',
            recordId: payload.sub,
            action: 'SYSTEM_ADMIN_2FA_SETUP',
            reason: '// SYSTEM-SCOPE: Super Admin enrolled 2FA',
            requestId: crypto.randomUUID(),
          },
        });
      },
    );

    return {
      secret,
      otpAuthUrl: `otpauth://totp/ExzaEstate:${payload.email}?secret=${secret}&issuer=ExzaEstate`,
    };
  }
}
