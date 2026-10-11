import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ClsModule } from 'nestjs-cls';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AdaptersModule } from '../../src/adapters/adapters.module.js';
import { configureApp } from '../../src/bootstrap.js';
import { ConfigModule } from '../../src/config/config.module.js';
import { ConfigService } from '../../src/config/config.service.js';
import { validateEnv } from '../../src/config/env.schema.js';
import { DatabaseModule } from '../../src/database/database.module.js';
import { SystemPrisma } from '../../src/database/system-prisma.service.js';
import { TenantDb } from '../../src/database/tenant-db.service.js';
import { AuthModule } from '../../src/modules/auth/auth.module.js';
import { TokenService } from '../../src/modules/auth/token.service.js';
import { ProjectModule } from '../../src/modules/project/project.module.js';
import { SystemAdminModule } from '../../src/modules/system-admin/system-admin.module.js';
import { PlatformModule } from '../../src/platform/platform.module.js';
import { TenantProvisioningModule } from '../../src/platform/tenant-provisioning/tenant-provisioning.module.js';

describe('Tenant Onboarding & Lifecycle Management (Task A1.5 - S2)', () => {
  let app: INestApplication;
  let systemPrisma: SystemPrisma;
  let tenantDb: TenantDb;
  let tokenService: TokenService;

  let systemToken: string;
  let systemAdminId: string;
  let createdTenantId: string;
  let tenantMdToken: string;
  let tenantMdUserId: string;

  const adminEmail = `sysadmin-${Date.now()}@exzaestate.test`;
  const adminPassword = 'SuperAdminPassword@2026!';
  const tenantCode = `ONBD${crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()}`;

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
      SYSTEM_DATABASE_URL:
        process.env.SYSTEM_DATABASE_URL ||
        'postgresql://exza_system:exza_system_secret@localhost:5432/exzaestate?schema=public',
      REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
      JWT_ACCESS_SECRET: 'super_secret_jwt_access_token_key_at_least_32_chars',
      JWT_REFRESH_SECRET: 'super_secret_jwt_refresh_token_key_at_least_32_chars',
      STORAGE_ENDPOINT: 'http://localhost:9000',
      STORAGE_BUCKET: 'exzaestate-documents',
      STORAGE_ACCESS_KEY: 'minioadmin',
      STORAGE_SECRET_KEY: 'minioadmin',
      CORS_ORIGIN: 'http://localhost:5173,tauri://localhost',
    });

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot(config),
        ClsModule.forRoot({ global: true, middleware: { mount: true } }),
        DatabaseModule,
        PlatformModule,
        AdaptersModule,
        AuthModule,
        ProjectModule,
        SystemAdminModule,
        TenantProvisioningModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    const configService = moduleRef.get(ConfigService);
    configureApp(app, configService);
    await app.init();

    systemPrisma = moduleRef.get(SystemPrisma);
    tenantDb = moduleRef.get(TenantDb);
    tokenService = moduleRef.get(TokenService);

    // Bootstrap Super Admin
    await systemPrisma.executeWithReason(
      '// SYSTEM-SCOPE: Prepare clean system admin for test',
      async (client) => {
        await client.systemSession.deleteMany({});
        await client.systemAdmin.deleteMany({});
      },
    );

    const reg = await request(app.getHttpServer())
      .post('/api/v1/system/auth/register-initial')
      .send({
        email: adminEmail,
        fullName: 'Super Admin Operator',
        password: adminPassword,
      });

    systemAdminId = reg.body.data.id;

    // Login to get setup token
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/system/auth/login')
      .send({ email: adminEmail, password: adminPassword });

    const setupToken = loginRes.body.error.details.setupToken;

    // Setup 2FA
    const setupRes = await request(app.getHttpServer())
      .post('/api/v1/system/auth/2fa/setup')
      .set('Authorization', `Bearer ${setupToken}`);

    const totpSecret = setupRes.body.data.secret;

    // Login with 2FA
    const authRes = await request(app.getHttpServer())
      .post('/api/v1/system/auth/login')
      .send({ email: adminEmail, password: adminPassword, totpSecret });

    systemToken = authRes.body.data.accessToken;
  });

  afterAll(async () => {
    if (systemAdminId) {
      await systemPrisma.executeWithReason(
        '// SYSTEM-SCOPE: Cleanup test superadmin',
        async (client) => {
          await client.systemAdmin.delete({ where: { id: systemAdminId } }).catch(() => {});
        },
      );
    }
    await app.close();
  });

  it('S2.1: Super Admin onboards a new company tenant via TenantProvisioningService', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/system/tenants')
      .set('Authorization', `Bearer ${systemToken}`)
      .send({
        name: 'Apex Skyline Properties Ltd.',
        code: tenantCode,
        timezone: 'Asia/Dhaka',
        branchName: 'Dhanmondi Branch',
        branchCode: 'DHN',
        managingDirector: {
          email: `md-${tenantCode.toLowerCase()}@exzaestate.test`,
          fullName: 'Tanvir Ahmed',
          password: 'Password123!Secure',
          isLocalMode: true,
        },
      })
      .expect(HttpStatus.CREATED);

    expect(res.body.success).toBe(true);
    expect(res.body.data.companyId).toBeDefined();
    expect(res.body.data.companyCode).toBe(tenantCode);
    createdTenantId = res.body.data.companyId;
    tenantMdUserId = res.body.data.managingDirectorUserId;

    // Issue token for tenant MD user
    const session = await tenantDb.withCompany(createdTenantId, async (tx) => {
      await tx.user.update({
        where: { id: tenantMdUserId },
        data: { status: 'ACTIVE', isTwoFactorEnabled: true },
      });
      return tx.session.create({
        data: {
          companyId: createdTenantId,
          userId: tenantMdUserId,
          familyId: crypto.randomUUID(),
        },
      });
    });

    tenantMdToken = tokenService.generateAccessToken({
      sub: tenantMdUserId,
      companyId: createdTenantId,
      sid: session.id,
    });
  });

  it('S2.2: Tenant MD can access tenant APIs while company is ACTIVE', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${tenantMdToken}`)
      .expect(HttpStatus.OK);

    expect(res.body.success).toBe(true);
  });

  it('S2.3: Super Admin lists platform tenants and verifies ACTIVE status', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/system/tenants')
      .set('Authorization', `Bearer ${systemToken}`)
      .expect(HttpStatus.OK);

    expect(res.body.success).toBe(true);
    const found = (res.body.data as Array<{ id: string; status: string }>).find(
      (t) => t.id === createdTenantId,
    );
    expect(found).toBeDefined();
    expect(found?.status).toBe('ACTIVE');
  });

  it('S2.4: Super Admin suspends the tenant company', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/system/tenants/${createdTenantId}/suspend`)
      .set('Authorization', `Bearer ${systemToken}`)
      .send({ reason: 'Commercial subscription audit pending' })
      .expect(HttpStatus.OK);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('SUSPENDED');
  });

  it('S2.5: Tenant guard blocks access when company is SUSPENDED (403 FORBIDDEN)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${tenantMdToken}`)
      .expect(HttpStatus.FORBIDDEN);

    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toContain('suspended');
  });

  it('S2.6: Super Admin reactivates the tenant company and access is restored', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/system/tenants/${createdTenantId}/reactivate`)
      .set('Authorization', `Bearer ${systemToken}`)
      .expect(HttpStatus.OK);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ACTIVE');

    // Tenant requests now succeed again
    const tenantRes = await request(app.getHttpServer())
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${tenantMdToken}`)
      .expect(HttpStatus.OK);

    expect(tenantRes.body.success).toBe(true);
  });
});
