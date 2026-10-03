import type { INestApplication } from '@nestjs/common';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ClsModule } from 'nestjs-cls';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PERMISSIONS } from '@exzaestate/shared';
import { AdaptersModule } from '../../src/adapters/adapters.module.js';
import { configureApp } from '../../src/bootstrap.js';
import { RequestContext } from '../../src/common/context/request-context.service.js';
import { RequirePermission } from '../../src/common/decorators/require-permission.decorator.js';
import { StepUp } from '../../src/common/decorators/step-up.decorator.js';
import { JwtAuthGuard } from '../../src/common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../src/common/guards/permissions.guard.js';
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

@Controller('test-step-up')
@UseGuards(JwtAuthGuard, PermissionsGuard)
class TestStepUpProtectedController {
  @RequirePermission(PERMISSIONS.PERIOD_CLOSE)
  @StepUp()
  @Get('close-period')
  closePeriod() {
    return { status: 'period-closed' };
  }
}

describe('S4: Step-Up Authentication Flow', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let prismaService: PrismaService;
  let tenantDb: TenantDb;
  let tokenService: TokenService;

  const testCompanyId = crypto.randomUUID();
  const testUserId = crypto.randomUUID();
  const testSessionId = crypto.randomUUID();
  let userToken = '';
  let totpSecret = '';

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
      controllers: [TestStepUpProtectedController],
      providers: [RequestContext, TenantDb, PermissionsGuard],
    }).compile();

    prismaService = moduleRef.get<PrismaService>(PrismaService);
    tenantDb = moduleRef.get<TenantDb>(TenantDb);
    tokenService = moduleRef.get<TokenService>(TokenService);
    const configService = moduleRef.get<ConfigService>(ConfigService);

    app = moduleRef.createNestApplication();
    configureApp(app, configService);
    await app.init();

    await prismaService.onModuleInit();

    totpSecret = TotpUtil.generateSecret();

    // Seed test company, user, session, and role with PERIOD_CLOSE permission
    await tenantDb.withCompany(testCompanyId, async (tx) => {
      await tx.company.create({
        data: {
          id: testCompanyId,
          companyId: testCompanyId,
          name: 'Step-Up Corp',
          code: `STEPUP-${Date.now()}`,
        },
      });

      await tx.user.create({
        data: {
          id: testUserId,
          companyId: testCompanyId,
          email: `stepup-${Date.now()}@test.com`,
          fullName: 'StepUp User',
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
          name: 'Senior Accountant',
          code: 'SNR_ACC',
        },
      });

      await tx.rolePermission.create({
        data: {
          companyId: testCompanyId,
          roleId: role.id,
          permissionCode: PERMISSIONS.PERIOD_CLOSE,
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

    // Enable 2FA for this user so they satisfy mandatory 2FA requirement
    const validOtp = TotpUtil.generateCode(totpSecret);
    const enableRes = await request(app.getHttpServer())
      .post('/api/v1/auth/2fa/enable')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ secret: totpSecret, token: validOtp });
    expect(enableRes.status).toBe(200);
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

  it('rejects call to @StepUp() endpoint before step-up authentication is performed', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/test-step-up/close-period')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('STEP_UP_REQUIRED');
  });

  it('POST /auth/step-up rejects invalid TOTP token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/step-up')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ token: '111111' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /auth/step-up sets stepUpUntil on session and allows @StepUp() protected calls', async () => {
    const freshOtp = TotpUtil.generateCode(totpSecret);

    const stepUpRes = await request(app.getHttpServer())
      .post('/api/v1/auth/step-up')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ token: freshOtp });

    expect(stepUpRes.status).toBe(200);
    expect(stepUpRes.body.data.stepUpUntil).toBeDefined();

    // Now protected endpoint should succeed!
    const res = await request(app.getHttpServer())
      .get('/api/v1/test-step-up/close-period')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('period-closed');
  });

  it('rejects call to @StepUp() when stepUpUntil is expired', async () => {
    // Set stepUpUntil in the past (expired)
    await tenantDb.withCompany(testCompanyId, async (tx) => {
      await tx.session.update({
        where: { id: testSessionId },
        data: { stepUpUntil: new Date(Date.now() - 1000) },
      });
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/test-step-up/close-period')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('STEP_UP_REQUIRED');
  });
});
