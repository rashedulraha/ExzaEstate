import { Inject, Injectable, Optional } from '@nestjs/common';
import { ERROR_CODES } from '@exzaestate/shared';
import { AppException } from '../../common/exceptions/app.exception.js';
import { PrismaService } from '../../database/prisma.service.js';
import { CACHE_STORE, type CacheStore } from '../../ports/index.js';

@Injectable()
export class AuthLockoutService {
  private readonly memoryStore = new Map<string, { val: string; expiresAt: number }>();

  constructor(
    private readonly prismaService: PrismaService,
    @Optional() @Inject(CACHE_STORE) private readonly cacheStore?: CacheStore,
  ) {}

  async checkLockout(email: string, ip: string): Promise<void> {
    const lockoutKey = `lockout:${email}:${ip}`;
    const isLocked = await this.getCache(lockoutKey);

    if (isLocked === '1') {
      throw new AppException(
        ERROR_CODES.ACCOUNT_LOCKED,
        'Account is temporarily locked due to multiple failed login attempts. Please try again after 15 minutes.',
      );
    }
  }

  async recordFailedAttempt(email: string, ip: string, userId?: string): Promise<void> {
    const counterKey = `login-failures:${email}:${ip}`;
    const lockoutKey = `lockout:${email}:${ip}`;

    const count = await this.incrCache(counterKey, 900);
    if (count >= 5) {
      await this.setCache(lockoutKey, '1', 900);
    }

    if (userId) {
      const lockUntil = count >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
      await this.prismaService.$executeRawUnsafe(
        `UPDATE users
         SET failed_login_attempts = failed_login_attempts + 1,
             locked_until = COALESCE($1, locked_until)
         WHERE id = $2::uuid`,
        lockUntil,
        userId,
      );
    }
  }

  async resetFailedAttempts(email: string, ip: string, userId: string): Promise<void> {
    const counterKey = `login-failures:${email}:${ip}`;
    const lockoutKey = `lockout:${email}:${ip}`;

    await this.delCache(counterKey);
    await this.delCache(lockoutKey);

    await this.prismaService.$executeRawUnsafe(
      `UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1::uuid`,
      userId,
    );
  }

  private async getCache(key: string): Promise<string | null> {
    if (this.cacheStore) {
      return (await this.cacheStore.get<string>(key)) ?? null;
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
    this.memoryStore.delete(key);
  }
}
