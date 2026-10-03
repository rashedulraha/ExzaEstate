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
import { PlatformModule } from '../../src/platform/platform.module.js';

describe('S5: Invitations Accept (DoD-BE)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let tenantDb: TenantDb;
  let clsService: ClsService;

  const testCompanyId = crypto.randomUUID();

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

    const prismaService = moduleRef.get<PrismaService>(PrismaService);
    tenantDb = moduleRef.get<TenantDb>(TenantDb);
    clsService = moduleRef.get<ClsService>(ClsService);
    const configService = moduleRef.get<ConfigService>(ConfigService);

    await prismaService.onModuleInit();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    configureApp(app, configService);
    await app.init();

    await clsService.run(async () => {
      clsService.set('companyId', testCompanyId);
      await tenantDb.transaction(async (tx) => {
        await tx.$executeRawUnsafe(
          `INSERT INTO companies (id, company_id, name, code)
           VALUES ('${testCompanyId}', '${testCompanyId}', 'Invitation Test Co', 'INV-${Date.now()}')`,
        );
      });
    });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('POST /api/v1/auth/invitations/accept', () => {
    it('accepts a valid invitation, creates active user, and returns auth tokens', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const invitedEmail = `invited-${Date.now()}@exzaestate.test`;
      const invitationId = crypto.randomUUID();

      await clsService.run(async () => {
        clsService.set('companyId', testCompanyId);
        await tenantDb.transaction(async (tx) => {
          await tx.$executeRawUnsafe(
            `INSERT INTO invitations (id, company_id, email, token_hash, expires_at, created_at)
             VALUES ('${invitationId}', '${testCompanyId}', '${invitedEmail}', '${tokenHash}', now() + interval '72 hours', now())`,
          );
        });
      });

      const res = await request(app.getHttpServer()).post('/api/v1/auth/invitations/accept').send({
        token: rawToken,
        password: 'Valid-Secure-Password-2026!',
        fullName: 'Alice In Wonderland',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.user.email).toBe(invitedEmail);
      expect(res.body.data.user.companyId).toBe(testCompanyId);

      const meRes = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${res.body.data.accessToken}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.data.email).toBe(invitedEmail);
      expect(meRes.body.data.status).toBe('ACTIVE');

      let checkRows: Array<{ accepted_at: Date | null }> = [];
      await clsService.run(async () => {
        clsService.set('companyId', testCompanyId);
        await tenantDb.transaction(async (tx) => {
          checkRows = await tx.$queryRawUnsafe<Array<{ accepted_at: Date | null }>>(
            `SELECT accepted_at FROM invitations WHERE id = $1::uuid`,
            invitationId,
          );
        });
      });
      expect(checkRows[0]?.accepted_at).not.toBeNull();
    });

    it('rejects an invitation that has already been accepted', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const invitedEmail = `already-accepted-${Date.now()}@exzaestate.test`;
      const invitationId = crypto.randomUUID();

      await clsService.run(async () => {
        clsService.set('companyId', testCompanyId);
        await tenantDb.transaction(async (tx) => {
          await tx.$executeRawUnsafe(
            `INSERT INTO invitations (id, company_id, email, token_hash, expires_at, accepted_at, created_at)
             VALUES ('${invitationId}', '${testCompanyId}', '${invitedEmail}', '${tokenHash}', now() + interval '72 hours', now(), now())`,
          );
        });
      });

      const res = await request(app.getHttpServer()).post('/api/v1/auth/invitations/accept').send({
        token: rawToken,
        password: 'Valid-Secure-Password-2026!',
        fullName: 'Double Accept User',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects an invitation that has expired (> 72 hours)', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const invitedEmail = `expired-${Date.now()}@exzaestate.test`;
      const invitationId = crypto.randomUUID();

      await clsService.run(async () => {
        clsService.set('companyId', testCompanyId);
        await tenantDb.transaction(async (tx) => {
          await tx.$executeRawUnsafe(
            `INSERT INTO invitations (id, company_id, email, token_hash, expires_at, created_at)
             VALUES ('${invitationId}', '${testCompanyId}', '${invitedEmail}', '${tokenHash}', now() - interval '1 hour', now())`,
          );
        });
      });

      const res = await request(app.getHttpServer()).post('/api/v1/auth/invitations/accept').send({
        token: rawToken,
        password: 'Valid-Secure-Password-2026!',
        fullName: 'Expired User',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects weak passwords failing the password policy', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const invitedEmail = `weakpass-${Date.now()}@exzaestate.test`;
      const invitationId = crypto.randomUUID();

      await clsService.run(async () => {
        clsService.set('companyId', testCompanyId);
        await tenantDb.transaction(async (tx) => {
          await tx.$executeRawUnsafe(
            `INSERT INTO invitations (id, company_id, email, token_hash, expires_at, created_at)
             VALUES ('${invitationId}', '${testCompanyId}', '${invitedEmail}', '${tokenHash}', now() + interval '72 hours', now())`,
          );
        });
      });

      const res = await request(app.getHttpServer()).post('/api/v1/auth/invitations/accept').send({
        token: rawToken,
        password: 'short',
        fullName: 'Weak User',
      });

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    });
  });
});
