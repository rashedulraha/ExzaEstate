import type { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ClsModule } from 'nestjs-cls';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PERMISSIONS } from '@exzaestate/shared';
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
import { TokenService } from '../../src/modules/auth/token.service.js';
import { TotpUtil } from '../../src/modules/auth/utils/totp.util.js';
import { PlatformModule } from '../../src/platform/platform.module.js';

describe('S3: TOTP Enrolment, Recovery Codes & Mandatory 2FA Flow', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let prismaService: PrismaService;
  let tenantDb: TenantDb;
  let tokenService: TokenService;

  const testCompanyId = crypto.randomUUID();
  const testUserId = crypto.randomUUID();
  const testSessionId = crypto.randomUUID();
  let userToken = '';

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
      providers: [RequestContext, TenantDb],
    }).compile();

    prismaService = moduleRef.get<PrismaService>(PrismaService);
    tenantDb = moduleRef.get<TenantDb>(TenantDb);
    tokenService = moduleRef.get<TokenService>(TokenService);
    const configService = moduleRef.get<ConfigService>(ConfigService);

    app = moduleRef.createNestApplication();
    configureApp(app, configService);
    await app.init();

    await prismaService.onModuleInit();

    // Seed test user with accountant role (journal:post permission - mandatory 2FA)
    await tenantDb.withCompany(testCompanyId, async (tx) => {
      await tx.company.create({
        data: {
          id: testCompanyId,
          companyId: testCompanyId,
          name: '2FA Test Corp',
          code: `2FA-${Date.now()}`,
        },
      });

      await tx.user.create({
        data: {
          id: testUserId,
          companyId: testCompanyId,
          email: `twofa-${Date.now()}@test.com`,
          fullName: '2FA User',
          passwordHash: 'dummy',
          isTwoFactorEnabled: false,
          status: 'ACTIVE',
        },
      });

      await tx.session.create({
        data: {
          id: testSessionId,
          companyId: testCompanyId,
          userId: testUserId,
          familyId: crypto.randomUUID(),
        },
      });

      const role = await tx.role.create({
        data: {
          companyId: testCompanyId,
          name: 'Accountant Role',
          code: 'ACC_2FA',
        },
      });

      await tx.rolePermission.create({
        data: {
          companyId: testCompanyId,
          roleId: role.id,
          permissionCode: PERMISSIONS.JOURNAL_POST,
          scope: 'ALL',
        },
      });

      await tx.userRole.create({
        data: {
          companyId: testCompanyId,
          userId: testUserId,
          roleId: role.id,
        },
      });
    });

    userToken = tokenService.generateAccessToken({
      sub: testUserId,
      companyId: testCompanyId,
      sid: testSessionId,
    });
  });

  afterAll(async () => {
    if (tenantDb) {
      await tenantDb.withCompany(testCompanyId, async (tx) => {
        await tx.userRole.deleteMany({ where: { companyId: testCompanyId } });
        await tx.rolePermission.deleteMany({ where: { companyId: testCompanyId } });
        await tx.role.deleteMany({ where: { companyId: testCompanyId } });
        await tx.session.deleteMany({ where: { companyId: testCompanyId } });
        await tx.user.deleteMany({ where: { companyId: testCompanyId } });
        await tx.company.deleteMany({ where: { id: testCompanyId } });
      });
    }
    if (app) {
      await app.close();
    }
  });

  let generatedSecret = '';
  let recoveryCodes: string[] = [];

  it('POST /auth/2fa/generate creates TOTP secret and otpauth URI without enabling yet', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/2fa/generate')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.secret).toBeDefined();
    expect(res.body.data.uri).toMatch(/^otpauth:\/\/totp\//);

    generatedSecret = res.body.data.secret;

    // Verify DB user is still NOT enabled
    const user = await tenantDb.withCompany(testCompanyId, async (tx) =>
      tx.user.findUnique({ where: { id: testUserId } }),
    );
    expect(user?.isTwoFactorEnabled).toBe(false);
  });

  it('POST /auth/2fa/enable rejects invalid TOTP verification code', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/2fa/enable')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        secret: generatedSecret,
        token: '000000',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /auth/2fa/enable enables 2FA, stores encrypted secret & hashed recovery codes', async () => {
    const validCode = TotpUtil.generateCode(generatedSecret);

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/2fa/enable')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        secret: generatedSecret,
        token: validCode,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.recoveryCodes).toBeDefined();
    expect(res.body.data.recoveryCodes.length).toBe(10);

    recoveryCodes = res.body.data.recoveryCodes;

    // Verify DB user record
    const user = await tenantDb.withCompany(testCompanyId, async (tx) =>
      tx.user.findUnique({ where: { id: testUserId } }),
    );

    expect(user?.isTwoFactorEnabled).toBe(true);
    expect(user?.twoFactorEnrolledAt).toBeDefined();
    // Secret must NOT be stored in plaintext base32
    expect(user?.twoFactorSecret).not.toBe(generatedSecret);
    expect(user?.twoFactorSecret).toContain(':'); // AES-256-GCM iv:authTag:ciphertext format
    // Stored recovery codes must be hashed, not plaintext
    expect(user?.twoFactorRecoveryCodes).toBeDefined();
    expect(user?.twoFactorRecoveryCodes.length).toBe(10);
    expect(user?.twoFactorRecoveryCodes[0]).not.toBe(recoveryCodes[0]);
  });

  it('POST /auth/2fa/disable disables 2FA with a valid TOTP code or recovery code', async () => {
    // Disable with one of the single-use recovery codes
    const usedCode = recoveryCodes[0]!;

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/2fa/disable')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        token: usedCode,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.message).toBe('Two-factor authentication disabled');

    const user = await tenantDb.withCompany(testCompanyId, async (tx) =>
      tx.user.findUnique({ where: { id: testUserId } }),
    );

    expect(user?.isTwoFactorEnabled).toBe(false);
    expect(user?.twoFactorSecret).toBeNull();
    expect(user?.twoFactorRecoveryCodes).toEqual([]);
    expect(user?.twoFactorEnrolledAt).toBeNull();
  });
});
