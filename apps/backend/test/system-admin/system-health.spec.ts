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
import { SystemAdminModule } from '../../src/modules/system-admin/system-admin.module.js';
import { PlatformModule } from '../../src/platform/platform.module.js';
import { TenantProvisioningModule } from '../../src/platform/tenant-provisioning/tenant-provisioning.module.js';
import { TenantProvisioningService } from '../../src/platform/tenant-provisioning/tenant-provisioning.service.js';

describe('System Health Monitoring Endpoint (Task A1.5 - S5)', () => {
  let app: INestApplication;
  let systemPrisma: SystemPrisma;
  let tenantDb: TenantDb;
  let provisioningService: TenantProvisioningService;

  let systemToken: string;
  let tenantToken: string;
  let tenantCompanyId: string;

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

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot(config),
        ClsModule.forRoot({ global: true, middleware: { mount: true } }),
        DatabaseModule,
        PlatformModule,
        AdaptersModule,
        AuthModule,
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
    provisioningService = moduleRef.get(TenantProvisioningService);

    // Bootstrap Super Admin
    await systemPrisma.executeWithReason(
      '// SYSTEM-SCOPE: Prepare clean system admin for health test',
      async (client) => {
        await client.systemSession.deleteMany({});
        await client.systemAdmin.deleteMany({});
      },
    );

    const adminEmail = `health-admin-${Date.now()}@exzaestate.test`;
    const adminPassword = 'SuperAdminPassword@2026!';
    await request(app.getHttpServer())
      .post('/api/v1/system/auth/register-initial')
      .send({ email: adminEmail, fullName: 'Super Admin', password: adminPassword });

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/system/auth/login')
      .send({ email: adminEmail, password: adminPassword });

    const setupRes = await request(app.getHttpServer())
      .post('/api/v1/system/auth/2fa/setup')
      .set('Authorization', `Bearer ${loginRes.body.error.details.setupToken}`);

    const authRes = await request(app.getHttpServer())
      .post('/api/v1/system/auth/login')
      .send({ email: adminEmail, password: adminPassword, totpSecret: setupRes.body.data.secret });
    systemToken = authRes.body.data.accessToken;

    // Provision a tenant company with sensitive business name
    const mdEmail = `md-hlth-${Date.now()}@exzaestate.test`;
    const mdPassword = 'Password123!Secure';
    const prov = await provisioningService.provisionCompany({
      name: 'Confidential Top Secret Real Estate Holdings Ltd.',
      code: `SEC${Date.now().toString().slice(-4)}`,
      branchName: 'Secret Vault Branch',
      branchCode: 'SV',
      managingDirector: {
        email: mdEmail,
        fullName: 'Confidential Executive',
        password: mdPassword,
        isLocalMode: true,
      },
    });
    tenantCompanyId = prov.companyId;

    await tenantDb.withCompany(tenantCompanyId, async (tx) => {
      await tx.user.update({
        where: { id: prov.managingDirectorUserId },
        data: { isTwoFactorEnabled: true },
      });
    });

    const tenantLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: mdEmail, password: mdPassword })
      .expect(HttpStatus.OK);
    tenantToken = tenantLoginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('S5.4: GET /api/v1/system/health is protected by SystemJwtAuthGuard', async () => {
    // Unauthenticated request fails
    await request(app.getHttpServer()).get('/api/v1/system/health').expect(HttpStatus.UNAUTHORIZED);

    // Tenant token is rejected on system endpoint
    await request(app.getHttpServer())
      .get('/api/v1/system/health')
      .set('Authorization', `Bearer ${tenantToken}`)
      .expect(HttpStatus.FORBIDDEN);
  });

  it('S5.5: Super Admin can query /api/v1/system/health with queue depth, backup status, and error rates', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/system/health')
      .set('Authorization', `Bearer ${systemToken}`)
      .expect(HttpStatus.OK);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();

    const data = res.body.data;
    expect(data.status).toBe('ok');
    expect(typeof data.uptime).toBe('number');
    expect(data.memory).toBeDefined();
    expect(typeof data.memory.heapUsed).toBe('number');

    // Queue depth metrics
    expect(data.queueDepth).toBeDefined();
    expect(typeof data.queueDepth.pending).toBe('number');
    expect(typeof data.queueDepth.active).toBe('number');
    expect(typeof data.queueDepth.completed).toBe('number');
    expect(typeof data.queueDepth.failed).toBe('number');

    // Backup status
    expect(data.backupStatus).toBeDefined();
    expect(data.backupStatus.status).toBeDefined();

    // Error rates
    expect(data.errorRates).toBeDefined();
    expect(typeof data.errorRates.lastHourErrors).toBe('number');
    expect(typeof data.errorRates.errorRatePercent).toBe('number');
  });

  it('S5.6: Zero business data is returned by system health endpoint', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/system/health')
      .set('Authorization', `Bearer ${systemToken}`)
      .expect(HttpStatus.OK);

    const jsonStr = JSON.stringify(res.body);

    // Must not leak any confidential tenant names, MD emails, or tenant company IDs
    expect(jsonStr).not.toContain('Confidential Top Secret Real Estate Holdings Ltd.');
    expect(jsonStr).not.toContain('Secret Vault Branch');
    expect(jsonStr).not.toContain('Confidential Executive');
    expect(jsonStr).not.toContain(tenantCompanyId);
  });
});
