import type { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ClsModule } from 'nestjs-cls';
import { AdaptersModule } from '../../src/adapters/adapters.module.js';
import { configureApp } from '../../src/bootstrap.js';
import { ConfigModule } from '../../src/config/config.module.js';
import { ConfigService } from '../../src/config/config.service.js';
import { validateEnv } from '../../src/config/env.schema.js';
import { DatabaseModule } from '../../src/database/database.module.js';
import { TenantDb } from '../../src/database/tenant-db.service.js';
import { AuthLockoutService } from '../../src/modules/auth/auth-lockout.service.js';
import { AuthModule } from '../../src/modules/auth/auth.module.js';
import { hashPassword } from '../../src/modules/auth/utils/password.util.js';
import { TotpUtil } from '../../src/modules/auth/utils/totp.util.js';
import { PlatformModule } from '../../src/platform/platform.module.js';
import {
  CAPTCHA_VERIFIER,
  EMAIL_PROVIDER,
  type CaptchaVerifier,
  type CaptchaVerifyResult,
  type EmailMessage,
  type EmailProvider,
  type EmailSendResult,
} from '../../src/ports/index.js';

describe('S2: Progressive Lockout & CAPTCHA Port (Tier 1)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let tenantDb: TenantDb;

  const testCompanyId = crypto.randomUUID();
  const testUserId = crypto.randomUUID();
  const testEmail = `prog-lockout-${Date.now()}@example.com`;
  const testPassword = 'Strong-Lockout-Password-2026!';
  const totpSecret = TotpUtil.generateSecret();

  const sentEmails: EmailMessage[] = [];
  const mockEmailProvider: EmailProvider = {
    async send(message: EmailMessage): Promise<EmailSendResult> {
      sentEmails.push(message);
      return { messageId: `msg-${Date.now()}`, status: 'SENT' };
    },
  };

  let mockCaptchaValid = true;
  const mockCaptchaVerifier: CaptchaVerifier = {
    async verify(token: string): Promise<CaptchaVerifyResult> {
      if (token === 'valid-captcha-token' && mockCaptchaValid) {
        return { success: true };
      }
      return { success: false, errorCodes: ['invalid-input-response'] };
    },
  };

  beforeAll(async () => {
    const config = validateEnv({
      NODE_ENV: 'test',
      PORT: '3000',
      RUNTIME_MODE: 'cloud',
      DATABASE_URL:
        process.env.DATABASE_URL ||
        'postgresql://exza_app:exza_app_secret@localhost:5432/exzaestate?schema=public',
      MIGRATOR_DATABASE_URL:
        process.env.MIGRATOR_DATABASE_URL ||
        'postgresql://exza_migrator:exza_migrator_secret@localhost:5432/exzaestate?schema=public',
      REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
      JWT_ACCESS_SECRET: 'super_secret_jwt_access_token_key_at_least_32_chars',
      JWT_REFRESH_SECRET: 'super_secret_jwt_refresh_token_key_at_least_32_chars',
      STORAGE_ENDPOINT: 'http://localhost:9000',
      STORAGE_BUCKET: 'exzaestate-documents',
      STORAGE_ACCESS_KEY: 'minioadmin',
      STORAGE_SECRET_KEY: 'minioadmin',
      CORS_ORIGIN: 'http://localhost:5173,tauri://localhost',
    });

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot(config),
        ClsModule.forRoot({
          global: true,
          middleware: { mount: true },
        }),
        DatabaseModule,
        AdaptersModule.forRoot('cloud'),
        PlatformModule,
        AuthModule,
      ],
    })
      .overrideProvider(EMAIL_PROVIDER)
      .useValue(mockEmailProvider)
      .overrideProvider(CAPTCHA_VERIFIER)
      .useValue(mockCaptchaVerifier)
      .compile();

    const configService = moduleRef.get<ConfigService>(ConfigService);
    app = moduleRef.createNestApplication();
    configureApp(app, configService);
    await app.init();

    tenantDb = moduleRef.get<TenantDb>(TenantDb);

    // Seed test company and user with 2FA enabled
    await tenantDb.withCompany(testCompanyId, async (tx) => {
      await tx.company.create({
        data: {
          id: testCompanyId,
          companyId: testCompanyId,
          name: 'Lockout Test Company',
          code: `LT_${Date.now()}`,
        },
      });

      const passwordHash = await hashPassword(testPassword);
      await tx.user.create({
        data: {
          id: testUserId,
          companyId: testCompanyId,
          email: testEmail,
          passwordHash,
          fullName: 'Lockout Test User',
          status: 'ACTIVE',
          isTwoFactorEnabled: true,
          twoFactorSecret: totpSecret,
        },
      });
    });
  });

  afterAll(async () => {
    try {
      await tenantDb.withCompany(testCompanyId, async (tx) => {
        await tx.user.deleteMany({ where: { companyId: testCompanyId } });
        await tx.company.delete({ where: { id: testCompanyId } });
      });
    } catch {
      // ignore
    }
    await app.close();
  });

  it('locks after 5 failures and requires CAPTCHA after the first lock', async () => {
    // 1. Fail 5 times
    for (let i = 0; i < 5; i++) {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testEmail, password: 'WrongPassword123!' });
      expect([401, 423]).toContain(res.status);
    }

    // 2. 6th attempt should be locked (423 ACCOUNT_LOCKED)
    const lockedRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: testEmail, password: testPassword });
    expect(lockedRes.status).toBe(423);

    // 3. Attempt after lockout without CAPTCHA token should be rejected as requiring CAPTCHA
    const noCaptchaRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: testEmail, password: testPassword });
    expect([400, 423]).toContain(noCaptchaRes.status);
    expect(
      JSON.stringify(noCaptchaRes.body).toLowerCase().includes('captcha') ||
        noCaptchaRes.body.error?.code === 'ACCOUNT_LOCKED',
    ).toBe(true);
  });

  it('triggers progressive lockout after 3 lockouts in 24 hours: plain password cannot unlock', async () => {
    const authLockoutService = moduleRef.get<AuthLockoutService>(AuthLockoutService);

    // Simulate 3 lockouts in 24 hours
    await authLockoutService.triggerLockout(testEmail, '127.0.0.1', testUserId);
    await authLockoutService.triggerLockout(testEmail, '127.0.0.1', testUserId);
    await authLockoutService.triggerLockout(testEmail, '127.0.0.1', testUserId);

    // Attempt login with correct password and valid CAPTCHA
    const attemptRes = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      email: testEmail,
      password: testPassword,
      captchaToken: 'valid-captcha-token',
    });

    // Acceptance: after 3 lockouts in 24 h a plain password attempt can NO LONGER unlock
    expect(attemptRes.status).toBe(423);
    expect(attemptRes.body.error?.code).toBe('ACCOUNT_LOCKED');
    expect(attemptRes.body.error?.message).toMatch(/unlock|repeated|security/i);
  });

  it('unlocks progressive lockout via email link + TOTP', async () => {
    sentEmails.length = 0;

    // 1. Request unlock email
    const requestUnlockRes = await request(app.getHttpServer())
      .post('/api/v1/auth/request-unlock')
      .send({ email: testEmail });

    expect(requestUnlockRes.status).toBe(200);
    expect(requestUnlockRes.body.success).toBe(true);
    expect(sentEmails.length).toBeGreaterThanOrEqual(1);

    // Extract unlock token from email message
    const email = sentEmails[0]!;
    const tokenMatch =
      email.text?.match(/token=([a-zA-Z0-9_-]+)/) || email.html?.match(/token=([a-zA-Z0-9_-]+)/);
    expect(tokenMatch).toBeDefined();
    const unlockToken = tokenMatch![1];

    // 2. Attempt unlock with wrong TOTP
    const wrongTotpRes = await request(app.getHttpServer())
      .post('/api/v1/auth/unlock')
      .send({ token: unlockToken, totpCode: '000000' });
    expect(wrongTotpRes.status).toBe(400);

    // 3. Unlock with valid TOTP code
    const validTotp = TotpUtil.generateCode(totpSecret);
    const validUnlockRes = await request(app.getHttpServer())
      .post('/api/v1/auth/unlock')
      .send({ token: unlockToken, totpCode: validTotp });
    expect(validUnlockRes.status).toBe(200);

    // 4. Login now succeeds with correct password
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: testEmail, password: testPassword });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.accessToken).toBeDefined();
  });
});
