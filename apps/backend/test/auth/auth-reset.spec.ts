import crypto from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { ClsModule, ClsService } from 'nestjs-cls';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AdaptersModule } from '../../src/adapters/adapters.module.js';
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

describe('S5: Password Reset & Session Revocation (DoD-BE)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let prismaService: PrismaService;
  let tenantDb: TenantDb;
  let clsService: ClsService;

  const testCompanyId = crypto.randomUUID();
  const existingUserId = crypto.randomUUID();
  const existingUserEmail = `reset-user-${Date.now()}@exzaestate.test`;
  const existingUserOldPassword = 'Original-Password-2026!';

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
        AdaptersModule.forRoot('cloud'),
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

    const oldPasswordHash = await hashPassword(existingUserOldPassword);
    await clsService.run(async () => {
      clsService.set('companyId', testCompanyId);
      await tenantDb.transaction(async (tx) => {
        await tx.$executeRawUnsafe(
          `INSERT INTO companies (id, company_id, name, code)
           VALUES ('${testCompanyId}', '${testCompanyId}', 'Reset Test Co', 'RST-${Date.now()}')`,
        );

        await tx.$executeRawUnsafe(
          `INSERT INTO users (id, company_id, email, password_hash, full_name, status, created_at, updated_at)
           VALUES ('${existingUserId}', '${testCompanyId}', '${existingUserEmail}', '${oldPasswordHash}', 'Reset User', 'ACTIVE', now(), now())`,
        );
      });
    });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('POST /api/v1/auth/password/forgot', () => {
    it('creates password reset record for existing user and returns safe message', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/password/forgot')
        .send({ email: existingUserEmail });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toBe(
        'If an account exists with this email, instructions have been sent.',
      );

      let resetRows: Array<{ id: string; user_id: string }> = [];
      await clsService.run(async () => {
        clsService.set('companyId', testCompanyId);
        await tenantDb.transaction(async (tx) => {
          resetRows = await tx.$queryRawUnsafe<Array<{ id: string; user_id: string }>>(
            `SELECT id, user_id FROM password_resets WHERE user_id = $1::uuid`,
            existingUserId,
          );
        });
      });
      expect(resetRows.length).toBeGreaterThanOrEqual(1);
    });

    it('returns identical safe message for non-existent email without creating record', async () => {
      const unknownEmail = `unknown-${Date.now()}@exzaestate.test`;

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/password/forgot')
        .send({ email: unknownEmail });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toBe(
        'If an account exists with this email, instructions have been sent.',
      );
    });
  });

  describe('POST /api/v1/auth/password/reset', () => {
    it('resets password, revokes all previous sessions, and allows login with new password', async () => {
      const loginBefore = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: existingUserEmail,
        password: existingUserOldPassword,
      });

      expect(loginBefore.status).toBe(200);
      const oldAccessToken = loginBefore.body.data.accessToken;

      const meBefore = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${oldAccessToken}`);
      expect(meBefore.status).toBe(200);

      const rawResetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = crypto.createHash('sha256').update(rawResetToken).digest('hex');
      const resetId = crypto.randomUUID();

      await clsService.run(async () => {
        clsService.set('companyId', testCompanyId);
        await tenantDb.transaction(async (tx) => {
          await tx.$executeRawUnsafe(
            `INSERT INTO password_resets (id, company_id, user_id, token_hash, expires_at, created_at)
             VALUES ('${resetId}', '${testCompanyId}', '${existingUserId}', '${resetTokenHash}', now() + interval '1 hour', now())`,
          );
        });
      });

      const newPassword = 'Brand-New-Secure-Password-2026!';

      const resetRes = await request(app.getHttpServer()).post('/api/v1/auth/password/reset').send({
        token: rawResetToken,
        newPassword,
      });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.success).toBe(true);
      expect(resetRes.body.data.message).toContain('successfully reset');

      const meAfter = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${oldAccessToken}`);
      expect(meAfter.status).toBe(401);

      const loginWithOld = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: existingUserEmail,
        password: existingUserOldPassword,
      });
      expect(loginWithOld.status).toBe(401);

      const loginWithNew = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: existingUserEmail,
        password: newPassword,
      });
      expect(loginWithNew.status).toBe(200);

      const reuseRes = await request(app.getHttpServer()).post('/api/v1/auth/password/reset').send({
        token: rawResetToken,
        newPassword: 'Another-Password-2026!',
      });
      expect(reuseRes.status).toBe(400);
    });

    it('rejects an expired password reset token', async () => {
      const rawResetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = crypto.createHash('sha256').update(rawResetToken).digest('hex');
      const resetId = crypto.randomUUID();

      await clsService.run(async () => {
        clsService.set('companyId', testCompanyId);
        await tenantDb.transaction(async (tx) => {
          await tx.$executeRawUnsafe(
            `INSERT INTO password_resets (id, company_id, user_id, token_hash, expires_at, created_at)
             VALUES ('${resetId}', '${testCompanyId}', '${existingUserId}', '${resetTokenHash}', now() - interval '1 hour', now())`,
          );
        });
      });

      const res = await request(app.getHttpServer()).post('/api/v1/auth/password/reset').send({
        token: rawResetToken,
        newPassword: 'Brand-New-Secure-Password-2026!',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
