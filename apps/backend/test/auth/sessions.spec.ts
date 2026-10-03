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
import { AuthModule } from '../../src/modules/auth/auth.module.js';
import { hashPassword } from '../../src/modules/auth/utils/password.util.js';
import { PlatformModule } from '../../src/platform/platform.module.js';
import {
  EMAIL_PROVIDER,
  type EmailMessage,
  type EmailProvider,
  type EmailSendResult,
} from '../../src/ports/index.js';

describe('S1: Sessions Management & New-Device Alert (Tier 1)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let tenantDb: TenantDb;

  const testCompanyId = crypto.randomUUID();
  const testUserId = crypto.randomUUID();
  const testEmail = `sessions-test-${Date.now()}@example.com`;
  const testPassword = 'Strong-Session-Password-2026!';

  const sentEmails: EmailMessage[] = [];
  const mockEmailProvider: EmailProvider = {
    async send(message: EmailMessage): Promise<EmailSendResult> {
      sentEmails.push(message);
      return { messageId: `msg-${Date.now()}`, status: 'SENT' };
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
      .compile();

    const configService = moduleRef.get<ConfigService>(ConfigService);
    app = moduleRef.createNestApplication();
    configureApp(app, configService);
    await app.init();

    tenantDb = moduleRef.get(TenantDb);

    // Seed test company and user
    await tenantDb.withCompany(testCompanyId, async (tx) => {
      await tx.company.create({
        data: {
          id: testCompanyId,
          companyId: testCompanyId,
          name: 'Session Test Company',
          code: `ST_${Date.now()}`,
        },
      });

      const passwordHash = await hashPassword(testPassword);
      await tx.user.create({
        data: {
          id: testUserId,
          companyId: testCompanyId,
          email: testEmail,
          passwordHash,
          fullName: 'Session Test User',
          status: 'ACTIVE',
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
      // ignore cleanup errors
    }
    await app.close();
  });

  it('lists active sessions of the current user (GET /auth/sessions)', async () => {
    // 1. Login to get first session
    const loginRes1 = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('User-Agent', 'Desktop-Client-1')
      .send({ email: testEmail, password: testPassword });

    expect(loginRes1.status).toBe(200);
    const token1 = loginRes1.body.data.accessToken;

    // 2. Fetch sessions
    const sessionsRes = await request(app.getHttpServer())
      .get('/api/v1/auth/sessions')
      .set('Authorization', `Bearer ${token1}`);

    expect(sessionsRes.status).toBe(200);
    expect(sessionsRes.body.success).toBe(true);
    expect(Array.isArray(sessionsRes.body.data)).toBe(true);
    expect(sessionsRes.body.data.length).toBeGreaterThanOrEqual(1);

    const currentSession = sessionsRes.body.data.find((s: { isCurrent: boolean }) => s.isCurrent);
    expect(currentSession).toBeDefined();
    expect(currentSession.userAgent).toBe('Desktop-Client-1');
  });

  it('revokes a specific session (DELETE /auth/sessions/:id)', async () => {
    // 1. Login with session 1
    const login1 = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('User-Agent', 'Device-Primary')
      .send({ email: testEmail, password: testPassword });
    const token1 = login1.body.data.accessToken;

    // 2. Login with session 2
    const login2 = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('User-Agent', 'Device-Secondary')
      .send({ email: testEmail, password: testPassword });
    const token2 = login2.body.data.accessToken;

    // 3. List sessions via token 1
    const listRes = await request(app.getHttpServer())
      .get('/api/v1/auth/sessions')
      .set('Authorization', `Bearer ${token1}`);
    expect(listRes.status).toBe(200);

    const session2 = listRes.body.data.find(
      (s: { userAgent: string }) => s.userAgent === 'Device-Secondary',
    );
    expect(session2).toBeDefined();

    // 4. Revoke session 2 using token 1
    const deleteRes = await request(app.getHttpServer())
      .delete(`/api/v1/auth/sessions/${session2.id}`)
      .set('Authorization', `Bearer ${token1}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);

    // 5. Subsequent request with token 2 must be rejected with 401
    const probeRes = await request(app.getHttpServer())
      .get('/api/v1/auth/sessions')
      .set('Authorization', `Bearer ${token2}`);
    expect(probeRes.status).toBe(401);

    // 6. Token 1 remains valid
    const validRes = await request(app.getHttpServer())
      .get('/api/v1/auth/sessions')
      .set('Authorization', `Bearer ${token1}`);
    expect(validRes.status).toBe(200);
  });

  it('revokes all sessions on logout-all (POST /auth/logout-all)', async () => {
    // 1. Create two sessions
    const login1 = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('User-Agent', 'Device-A')
      .send({ email: testEmail, password: testPassword });
    const token1 = login1.body.data.accessToken;

    const login2 = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('User-Agent', 'Device-B')
      .send({ email: testEmail, password: testPassword });
    const token2 = login2.body.data.accessToken;

    // 2. Call logout-all
    const logoutAllRes = await request(app.getHttpServer())
      .post('/api/v1/auth/logout-all')
      .set('Authorization', `Bearer ${token1}`);
    expect(logoutAllRes.status).toBe(200);

    // 3. Both tokens must now be rejected
    const test1 = await request(app.getHttpServer())
      .get('/api/v1/auth/sessions')
      .set('Authorization', `Bearer ${token1}`);
    expect(test1.status).toBe(401);

    const test2 = await request(app.getHttpServer())
      .get('/api/v1/auth/sessions')
      .set('Authorization', `Bearer ${token2}`);
    expect(test2.status).toBe(401);
  });

  it('triggers email alert on new-device login', async () => {
    sentEmails.length = 0; // reset

    // Login from a distinct novel user-agent
    const novelDeviceAgent = `Brand-New-Device-Browser-${Date.now()}`;
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('User-Agent', novelDeviceAgent)
      .send({ email: testEmail, password: testPassword });

    expect(loginRes.status).toBe(200);

    // Must have sent email alert
    expect(sentEmails.length).toBeGreaterThanOrEqual(1);
    const alertEmail = sentEmails.find(
      (e) =>
        e.subject.toLowerCase().includes('device') ||
        e.subject.toLowerCase().includes('login') ||
        e.subject.toLowerCase().includes('security'),
    );
    expect(alertEmail).toBeDefined();
    expect(alertEmail!.to).toBe(testEmail);
  });
});
