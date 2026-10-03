import type { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { ClsModule, ClsService } from 'nestjs-cls';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configureApp } from '../../src/bootstrap.js';
import { RequestContext } from '../../src/common/context/request-context.service.js';
import { ConfigModule } from '../../src/config/config.module.js';
import { ConfigService } from '../../src/config/config.service.js';
import { validateEnv } from '../../src/config/env.schema.js';
import { DatabaseModule } from '../../src/database/database.module.js';
import { PrismaService } from '../../src/database/prisma.service.js';
import { TenantDb } from '../../src/database/tenant-db.service.js';
import { AuthModule } from '../../src/modules/auth/auth.module.js';
import { hashPassword } from '../../src/modules/auth/utils/password.util.js';
import { PlatformModule } from '../../src/platform/platform.module.js';

describe('S3: Auth Routes, DTOs, JwtAuthGuard & Client Delivery (Web vs Desktop)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let prismaService: PrismaService;
  let tenantDb: TenantDb;

  const testCompanyId = crypto.randomUUID();
  const testUserId = crypto.randomUUID();
  const testEmail = `auth-test-${Date.now()}@example.com`;
  const testPassword = 'Strong-Auth-Password-2026!';

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
        PlatformModule,
        AuthModule,
      ],
      providers: [RequestContext, TenantDb],
    }).compile();

    prismaService = moduleRef.get<PrismaService>(PrismaService);
    tenantDb = moduleRef.get<TenantDb>(TenantDb);
    const configService = moduleRef.get<ConfigService>(ConfigService);

    await prismaService.onModuleInit();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    configureApp(app, configService);
    await app.init();

    // Seed test company and user with hashed password
    const hashedPassword = await hashPassword(testPassword);
    const clsService = moduleRef.get<ClsService>(ClsService);
    await clsService.run(async () => {
      clsService.set('companyId', testCompanyId);
      await tenantDb.transaction(async (tx) => {
        await tx.$executeRawUnsafe(
          `INSERT INTO companies (id, company_id, name, code)
           VALUES ('${testCompanyId}', '${testCompanyId}', 'Auth Routes Test Corp', 'ARTC-${Date.now()}')`,
        );

        await tx.$executeRawUnsafe(
          `INSERT INTO users (id, company_id, email, password_hash, full_name)
           VALUES ('${testUserId}', '${testCompanyId}', '${testEmail}', '${hashedPassword}', 'Test User')`,
        );
      });
    });
  });

  afterAll(async () => {
    if (prismaService) {
      const clsService = moduleRef.get<ClsService>(ClsService);
      await clsService.run(async () => {
        clsService.set('companyId', testCompanyId);
        await tenantDb.transaction(async (tx) => {
          await tx.$executeRawUnsafe(
            `DELETE FROM refresh_tokens WHERE company_id = '${testCompanyId}'`,
          );
          await tx.$executeRawUnsafe(`DELETE FROM sessions WHERE company_id = '${testCompanyId}'`);
          await tx.$executeRawUnsafe(`DELETE FROM users WHERE company_id = '${testCompanyId}'`);
          await tx.$executeRawUnsafe(`DELETE FROM companies WHERE id = '${testCompanyId}'`);
        });
      });
      await prismaService.onModuleDestroy();
    }
    if (app) {
      await app.close();
    }
  });

  it('Desktop client login: delivers both access and refresh tokens in JSON body', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('X-Client', 'desktop')
      .send({
        email: testEmail,
        password: testPassword,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user.email).toBe(testEmail);
    expect(res.body.data.user.companyId).toBe(testCompanyId);
  });

  it('Web client login: sets HttpOnly cookie for refresh token, access token in body', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('X-Client', 'web')
      .set('Origin', 'http://localhost:5173')
      .send({
        email: testEmail,
        password: testPassword,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    // In web mode, refreshToken is NOT returned in body
    expect(res.body.data.refreshToken).toBeUndefined();

    // Cookie must be set
    const cookies = res.headers['set-cookie'] as string[] | undefined;
    expect(cookies).toBeDefined();
    const refreshCookie = cookies?.find((c) => c.startsWith('refresh_token='));
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toContain('HttpOnly');
    expect(refreshCookie).toContain('Path=/api/v1/auth');
    expect(refreshCookie).toContain('SameSite=Strict');
  });

  it('enforces CSRF check on Web cookie refresh: rejects mismatched or missing Origin', async () => {
    // Attempt refresh without Origin header
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('X-Client', 'web')
      .set('Cookie', ['refresh_token=dummy_token']);

    expect(res.status).toBe(403);
  });

  it('GET /api/v1/auth/me: returns authenticated user data via JwtAuthGuard', async () => {
    // 1. Login to get token
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('X-Client', 'desktop')
      .send({
        email: testEmail,
        password: testPassword,
      });

    const accessToken = loginRes.body.data.accessToken;

    // 2. Call /me with Bearer token
    const meRes = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.data.id).toBe(testUserId);
    expect(meRes.body.data.email).toBe(testEmail);
    expect(meRes.body.data.companyId).toBe(testCompanyId);
  });

  it('GET /api/v1/auth/me: rejects unauthenticated requests with 401', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });
});
