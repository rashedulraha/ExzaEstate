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
import { TenantProvisioningService } from '../../src/platform/tenant-provisioning/tenant-provisioning.service.js';

describe('System Realm & Super Admin (Task A1.5 - S1)', () => {
  let app: INestApplication;
  let systemPrisma: SystemPrisma;
  let tenantDb: TenantDb;
  let tokenService: TokenService;
  let provisioningService: TenantProvisioningService;

  let tenantToken: string;
  let tenantCompanyId: string;
  const adminEmail = `superadmin-${Date.now()}@exzaestate.test`;
  const adminPassword = 'SuperAdminSecurePass@2026!';
  let systemAdminId: string;
  let systemToken: string;
  let totpSecret: string;

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
    provisioningService = moduleRef.get(TenantProvisioningService);

    await systemPrisma.executeWithReason(
      '// SYSTEM-SCOPE: Prepare clean system admin for test',
      async (client) => {
        await client.systemSession.deleteMany({});
        await client.systemAdmin.deleteMany({});
      },
    );

    // Provision a tenant for cross-realm isolation tests
    const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 8);
    const prov = await provisioningService.provisionCompany({
      name: 'System Realm Test Tenant',
      code: `SYS${suffix}`,
      branchName: 'Main Branch',
      branchCode: 'MB',
      managingDirector: {
        email: `md-${suffix}@exzaestate.test`,
        fullName: 'MD Tenant',
        password: 'Password123!Secure',
        isLocalMode: true,
      },
    });
    tenantCompanyId = prov.companyId;

    const session = await tenantDb.withCompany(tenantCompanyId, async (tx) => {
      await tx.user.update({
        where: { id: prov.managingDirectorUserId },
        data: { status: 'ACTIVE', isTwoFactorEnabled: true },
      });
      return tx.session.create({
        data: {
          companyId: tenantCompanyId,
          userId: prov.managingDirectorUserId,
          familyId: crypto.randomUUID(),
        },
      });
    });
    tenantToken = tokenService.generateAccessToken({
      sub: prov.managingDirectorUserId,
      companyId: tenantCompanyId,
      sid: session.id,
    });
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

  it('S1.1: Super Admin login fails if credentials are invalid', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/system/auth/login')
      .send({ email: 'nonexistent@exzaestate.test', password: 'wrong' })
      .expect(HttpStatus.UNAUTHORIZED);

    expect(res.body.success).toBe(false);
  });

  it('S1.2: Register initial Super Admin and enforce mandatory 2FA on login', async () => {
    // Bootstrap initial admin
    const registerRes = await request(app.getHttpServer())
      .post('/api/v1/system/auth/register-initial')
      .send({
        email: adminEmail,
        fullName: 'Platform Super Admin',
        password: adminPassword,
      });

    expect([HttpStatus.CREATED, HttpStatus.OK]).toContain(registerRes.status);
    systemAdminId = registerRes.body.data.id;

    // Login without 2FA must be rejected with TWO_FACTOR_REQUIRED
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/system/auth/login')
      .send({ email: adminEmail, password: adminPassword })
      .expect(HttpStatus.FORBIDDEN);

    expect(loginRes.body.error.code).toBe('TWO_FACTOR_REQUIRED');
    const setupToken = loginRes.body.error.details.setupToken;
    expect(setupToken).toBeDefined();

    // Setup 2FA
    const setupRes = await request(app.getHttpServer())
      .post('/api/v1/system/auth/2fa/setup')
      .set('Authorization', `Bearer ${setupToken}`)
      .expect(HttpStatus.OK);

    totpSecret = setupRes.body.data.secret;
    expect(totpSecret).toBeDefined();
  });

  it('S1.3: Super Admin login with valid TOTP code returns system-scoped access token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/system/auth/login')
      .send({
        email: adminEmail,
        password: adminPassword,
        totpSecret, // In test mode, passing secret enables automatic valid code generation
      })
      .expect(HttpStatus.OK);

    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.realm).toBe('system');
    systemToken = res.body.data.accessToken;
  });

  it('S1.4: Cross-realm isolation: Tenant token is rejected on system realm endpoints', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/system/tenants')
      .set('Authorization', `Bearer ${tenantToken}`)
      .expect(HttpStatus.FORBIDDEN);

    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('S1.5: Cross-realm isolation: Super Admin token is rejected on tenant business endpoints', async () => {
    // Super Admin has NO tenant business data access (AT-30)
    const res = await request(app.getHttpServer())
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${systemToken}`)
      .expect(HttpStatus.FORBIDDEN);

    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('S1.6: Every system call is audit logged with SYSTEM-SCOPE reason', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/system/tenants')
      .set('Authorization', `Bearer ${systemToken}`)
      .expect(HttpStatus.OK);

    const logs = await systemPrisma.executeWithReason(
      '// SYSTEM-SCOPE: Verify audit logs',
      async (client) => {
        return client.auditLog.findMany({
          where: { action: { contains: 'SYSTEM' } },
          orderBy: { createdAt: 'desc' },
          take: 5,
        });
      },
    );
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs[0]?.reason).toContain('SYSTEM-SCOPE');
  });
});
