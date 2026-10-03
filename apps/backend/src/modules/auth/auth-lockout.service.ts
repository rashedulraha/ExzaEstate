import crypto from 'node:crypto';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { ERROR_CODES } from '@exzaestate/shared';
import { AppException, ValidationException } from '../../common/exceptions/app.exception.js';
import { PrismaService } from '../../database/prisma.service.js';
import { TenantDb } from '../../database/tenant-db.service.js';
import {
  CACHE_STORE,
  CAPTCHA_VERIFIER,
  EMAIL_PROVIDER,
  type CacheStore,
  type CaptchaVerifier,
  type EmailProvider,
} from '../../ports/index.js';
import { TotpUtil } from './utils/totp.util.js';

interface PreTenantUser {
  id: string;
  company_id: string;
  email: string;
  is_two_factor_enabled: boolean;
}

@Injectable()
export class AuthLockoutService {
  private readonly memoryStore = new Map<string, { val: string; expiresAt: number }>();

  constructor(
    private readonly prismaService: PrismaService,
    @Inject(TenantDb) private readonly tenantDb: TenantDb,
    @Optional() @Inject(CACHE_STORE) private readonly cacheStore?: CacheStore,
    @Optional() @Inject(CAPTCHA_VERIFIER) private readonly captchaVerifier?: CaptchaVerifier,
    @Optional() @Inject(EMAIL_PROVIDER) private readonly emailProvider?: EmailProvider,
  ) {}

  /**
   * Checks whether the given email/IP is locked out or requires CAPTCHA verification (A0.12 S2).
   */
  async checkLockout(email: string, ip: string, captchaToken?: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Progressive lockout check: 3 lockouts in 24 h → plain password CANNOT unlock
    const progressiveKey = `progressive-lockout:${normalizedEmail}`;
    const isProgressive = await this.getCache(progressiveKey);
    if (isProgressive === '1') {
      throw new AppException(
        ERROR_CODES.ACCOUNT_LOCKED,
        'Account is locked due to repeated security events. Unlock via email verification and 2FA required.',
      );
    }

    // 2. Standard 15-minute lockout check per (email, ip)
    const ipLockoutKey = `lockout:${normalizedEmail}:${ip}`;
    const isIpLocked = await this.getCache(ipLockoutKey);

    if (isIpLocked === '1') {
      throw new AppException(
        ERROR_CODES.ACCOUNT_LOCKED,
        'Account is temporarily locked due to multiple failed login attempts. Please try again after 15 minutes.',
      );
    }

    // 3. CAPTCHA verification required after the first lock for this (email, ip) (A0.12 S2)
    const captchaReqKey = `captcha-required:${normalizedEmail}:${ip}`;
    const isCaptchaRequired = await this.getCache(captchaReqKey);

    if (isCaptchaRequired === '1') {
      if (!captchaToken) {
        throw new ValidationException('CAPTCHA verification required');
      }

      if (this.captchaVerifier) {
        const verifyRes = await this.captchaVerifier.verify(captchaToken, ip);
        if (!verifyRes.success) {
          throw new ValidationException('Invalid or expired CAPTCHA token');
        }
      }
    }
  }

  /**
   * Records a failed login attempt for (email, ip) and triggers lockouts when threshold is reached.
   */
  async recordFailedAttempt(email: string, ip: string, userId?: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    const counterKey = `login-failures:${normalizedEmail}:${ip}`;

    const count = await this.incrCache(counterKey, 900);
    if (count >= 5) {
      await this.triggerLockout(normalizedEmail, ip, userId);
    } else if (userId) {
      await this.prismaService.$executeRawUnsafe(
        `UPDATE users
         SET failed_login_attempts = failed_login_attempts + 1
         WHERE id = $1::uuid`,
        userId,
      );
    }
  }

  /**
   * Triggers a lockout event: sets 15-min lock, sets CAPTCHA flag, and tracks 24h count.
   */
  async triggerLockout(email: string, ip: string, userId?: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    const ipLockoutKey = `lockout:${normalizedEmail}:${ip}`;
    const captchaReqKey = `captcha-required:${normalizedEmail}:${ip}`;
    const count24hKey = `lockout-count-24h:${normalizedEmail}`;

    // Set 15-minute lock for this (email, ip)
    await this.setCache(ipLockoutKey, '1', 900);

    // After the first lock, CAPTCHA is required for subsequent logins (24 hours) from this IP
    await this.setCache(captchaReqKey, '1', 86400);

    // Track lockouts in 24 hours
    const lockoutsIn24h = await this.incrCache(count24hKey, 86400);

    // If 3 lockouts in 24 hours, enforce progressive lockout across all IPs
    if (lockoutsIn24h >= 3) {
      await this.setCache(`progressive-lockout:${normalizedEmail}`, '1', 86400 * 7);
    }

    if (userId) {
      const lockUntil = new Date(Date.now() + 15 * 60 * 1000);
      await this.prismaService.$executeRawUnsafe(
        `UPDATE users
         SET failed_login_attempts = failed_login_attempts + 1,
             locked_until = $1
         WHERE id = $2::uuid`,
        lockUntil,
        userId,
      );
    }
  }

  /**
   * Resets failed login counters on successful login.
   */
  async resetFailedAttempts(email: string, ip: string, userId: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    const counterKey = `login-failures:${normalizedEmail}:${ip}`;
    const ipLockoutKey = `lockout:${normalizedEmail}:${ip}`;
    const aggregateLockoutKey = `lockout:${normalizedEmail}`;

    await this.delCache(counterKey);
    await this.delCache(ipLockoutKey);
    await this.delCache(aggregateLockoutKey);

    await this.prismaService.$executeRawUnsafe(
      `UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1::uuid`,
      userId,
    );
  }

  /**
   * Initiates unlock flow by generating and emailing a secure unlock token (A0.12 S2).
   */
  async requestUnlock(email: string): Promise<{ message: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const rows = await this.prismaService.$queryRawUnsafe<PreTenantUser[]>(
      `SELECT id, company_id, email, is_two_factor_enabled FROM auth_find_user_by_email($1::text)`,
      normalizedEmail,
    );
    const user = rows[0];

    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      await this.setCache(
        `unlock-token:${tokenHash}`,
        JSON.stringify({ userId: user.id, companyId: user.company_id, email: normalizedEmail }),
        900,
      );

      if (this.emailProvider) {
        await this.emailProvider.send({
          to: user.email,
          subject: 'Security Alert: Unlock Your ExzaEstate Account',
          html: `<p>Your account was locked due to multiple security events. To unlock, please use token=${rawToken} and your 2FA authenticator code.</p>`,
          text: `Your account was locked due to multiple security events. To unlock, please use token=${rawToken} and your 2FA authenticator code.`,
        });
      }
    }

    return {
      message: 'If the account is locked, unlock instructions have been sent.',
    };
  }

  /**
   * Validates unlock token + TOTP and releases progressive lockout.
   */
  async unlock(token: string, totpCode: string): Promise<{ message: string }> {
    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');
    const cachedData = await this.getCache(`unlock-token:${tokenHash}`);

    if (!cachedData) {
      throw new ValidationException('Invalid or expired unlock token');
    }

    const { userId, companyId, email } = JSON.parse(cachedData) as {
      userId: string;
      companyId: string;
      email: string;
    };

    const userRows = await this.tenantDb.withCompany(companyId, async (tx) => {
      return tx.$queryRawUnsafe<
        Array<{
          two_factor_secret: string | null;
          two_factor_recovery_codes: string[];
          is_two_factor_enabled: boolean;
        }>
      >(
        `SELECT two_factor_secret, two_factor_recovery_codes, is_two_factor_enabled
         FROM users WHERE id = $1::uuid`,
        userId,
      );
    });

    const user = userRows[0];
    if (!user || !user.two_factor_secret) {
      throw new ValidationException('2FA verification is required to unlock this account');
    }

    const isValidTotp = TotpUtil.verifyToken(user.two_factor_secret, totpCode);
    const isRecoveryCode =
      user.two_factor_recovery_codes?.includes(TotpUtil.hashRecoveryCode(totpCode)) ?? false;

    if (!isValidTotp && !isRecoveryCode) {
      throw new ValidationException('Invalid TOTP verification code');
    }

    // Clear all lockout flags for this email
    await this.delCache(`unlock-token:${tokenHash}`);
    await this.delCache(`progressive-lockout:${email}`);
    await this.delCache(`lockout-count-24h:${email}`);
    await this.delCache(`captcha-required:${email}*`);
    await this.delCache(`lockout:${email}*`);
    await this.delCache(`login-failures:${email}*`);

    await this.tenantDb.withCompany(companyId, async (tx) => {
      await tx.$executeRawUnsafe(
        `UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1::uuid`,
        userId,
      );
    });

    return { message: 'Account unlocked successfully. You may now log in.' };
  }

  private async getCache(key: string): Promise<string | null> {
    if (this.cacheStore) {
      const val = await this.cacheStore.get<unknown>(key);
      if (val === null || val === undefined) return null;
      if (typeof val === 'object') return JSON.stringify(val);
      return String(val);
    }

    const item = this.memoryStore.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.memoryStore.delete(key);
      return null;
    }
    return item.val;
  }

  private async setCache(key: string, val: string, ttlSeconds: number): Promise<void> {
    if (this.cacheStore) {
      await this.cacheStore.set(key, val, ttlSeconds);
      return;
    }
    this.memoryStore.set(key, { val, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  private async incrCache(key: string, ttlSeconds: number = 900): Promise<number> {
    if (this.cacheStore) {
      const val = await this.cacheStore.incr(key);
      if (val === 1) {
        await this.cacheStore.set(key, '1', ttlSeconds);
      }
      return val;
    }
    const current = await this.getCache(key);
    const next = (current ? parseInt(current, 10) : 0) + 1;
    this.memoryStore.set(key, { val: next.toString(), expiresAt: Date.now() + ttlSeconds * 1000 });
    return next;
  }

  private async delCache(key: string): Promise<void> {
    if (this.cacheStore) {
      await this.cacheStore.del(key);
      return;
    }
    if (key.includes('*')) {
      const regex = new RegExp(`^${key.replace(/\*/g, '.*')}$`);
      for (const k of this.memoryStore.keys()) {
        if (regex.test(k)) this.memoryStore.delete(k);
      }
      return;
    }
    this.memoryStore.delete(key);
  }
}
