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

describe('S4: Progressive Lockout, Throttling & Enumeration Safety (OQ-02, AT-18)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let prismaService: PrismaService;
  let tenantDb: TenantDb;
  let clsService: ClsService;

  const companyA = crypto.randomUUID();
  const companyB = crypto.randomUUID();

  const userAId = crypto.randomUUID();
  const userBId = crypto.randomUUID();

  const userAEmail = `user-a-${Date.now()}@test.com`;
  const userBEmail = `user-b-${Date.now()}@test.com`;
  const validPassword = 'Correct-Password-2026!';

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
    clsService = moduleRef.get<ClsService>(ClsService);
    const configService = moduleRef.get<ConfigService>(ConfigService);

    await prismaService.onModuleInit();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    configureApp(app, configService);
    await app.init();

    // Seed Company A and User A
    const passwordHash = await hashPassword(validPassword);
    await clsService.run(async () => {
      clsService.set('companyId', companyA);
      await tenantDb.transaction(async (tx) => {
        await tx.$executeRawUnsafe(
          `INSERT INTO companies (id, company_id, name, code)
           VALUES ('${companyA}', '${companyA}', 'Company A', 'COA-${Date.now()}')`,
        );
        await tx.$executeRawUnsafe(
          `INSERT INTO users (id, company_id, email, password_hash, full_name)
           VALUES ('${userAId}', '${companyA}', '${userAEmail}', '${passwordHash}', 'User A')`,
        );
      });
    });

    // Seed Company B and User B
    await clsService.run(async () => {
      clsService.set('companyId', companyB);
      await tenantDb.transaction(async (tx) => {
        await tx.$executeRawUnsafe(
          `INSERT INTO companies (id, company_id, name, code)
           VALUES ('${companyB}', '${companyB}', 'Company B', 'COB-${Date.now()}')`,
        );
        await tx.$executeRawUnsafe(
          `INSERT INTO users (id, company_id, email, password_hash, full_name)
           VALUES ('${userBId}', '${companyB}', '${userBEmail}', '${passwordHash}', 'User B')`,
        );
      });
    });
  });

  afterAll(async () => {
    if (prismaService) {
      await clsService.run(async () => {
        clsService.set('companyId', companyA);
        await tenantDb.transaction(async (tx) => {
          await tx.$executeRawUnsafe(`DELETE FROM users WHERE company_id = '${companyA}'`);
          await tx.$executeRawUnsafe(`DELETE FROM companies WHERE id = '${companyA}'`);
        });
      });

      await clsService.run(async () => {
        clsService.set('companyId', companyB);
        await tenantDb.transaction(async (tx) => {
          await tx.$executeRawUnsafe(`DELETE FROM users WHERE company_id = '${companyB}'`);
          await tx.$executeRawUnsafe(`DELETE FROM companies WHERE id = '${companyB}'`);
        });
      });

      await prismaService.onModuleDestroy();
    }
    if (app) {
      await app.close();
    }
  });

  it('locks out after 5 consecutive bad passwords for (email, ip)', async () => {
    const testIp = '10.0.0.1';
    const targetEmail = userAEmail;

    // Attempts 1 to 4: returns 401
    for (let i = 1; i <= 4; i++) {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('X-Forwarded-For', testIp)
        .send({
          email: targetEmail,
          password: 'wrong-password',
        });
      expect(res.status).toBe(401);
      expect(res.body.error?.code).toBe('UNAUTHORIZED');
    }

    // Attempt 5: triggers lockout
    const res5 = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', testIp)
      .send({
        email: targetEmail,
        password: 'wrong-password',
      });
    expect(res5.status).toBe(401);

    // Attempt 6: locked out! returns ACCOUNT_LOCKED (423 or 401)
    const res6 = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', testIp)
      .send({
        email: targetEmail,
        password: validPassword, // even with correct password!
      });

    expect(res6.body.error?.code).toBe('ACCOUNT_LOCKED');
  });

  it('prevents DoS: different IP is not locked out for the same email', async () => {
    const differentIp = '10.0.0.2';

    // Different IP should still be able to log in with correct credentials
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', differentIp)
      .send({
        email: userAEmail,
        password: validPassword,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('provides enumeration-safe response for non-existent email', async () => {
    const resUnknown = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      email: 'nobody-exists-in-system@example.com',
      password: 'wrong-password-12345',
    });

    expect(resUnknown.status).toBe(401);
    expect(resUnknown.body.error?.code).toBe('UNAUTHORIZED');
    expect(resUnknown.body.error?.message).toBe('Invalid email or password');
  });

  it('AT-18: User logs in (lookup before tenant known) but can never read another company rows', async () => {
    // 1. User A logs in (email lookup without tenant context)
    const loginRes = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      email: userAEmail,
      password: validPassword,
    });

    expect(loginRes.status).toBe(200);
    const tokenA = loginRes.body.data.accessToken;

    // 2. User A calls /me
    const meRes = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.id).toBe(userAId);
    expect(meRes.body.data.companyId).toBe(companyA);

    // 3. User A attempts to read Company B data from DB under their tenant context
    await clsService.run(async () => {
      clsService.set('companyId', companyA);
      await tenantDb.transaction(async (tx) => {
        // Query users table: User B must be invisible!
        const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
          `SELECT id FROM users WHERE id = '${userBId}'`,
        );
        expect(rows.length).toBe(0);

        // Query companies table: Company B must be invisible!
        const compRows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
          `SELECT id FROM companies WHERE id = '${companyB}'`,
        );
        expect(compRows.length).toBe(0);
      });
    });
  });
});
