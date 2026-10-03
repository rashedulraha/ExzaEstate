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
import { AuthModule } from '../../src/modules/auth/auth.module.js';
import { LicenseModule } from '../../src/modules/license/license.module.js';
import { SystemAdminModule } from '../../src/modules/system-admin/system-admin.module.js';
import { PlatformModule } from '../../src/platform/platform.module.js';
import { TenantProvisioningModule } from '../../src/platform/tenant-provisioning/tenant-provisioning.module.js';
import { TenantProvisioningService } from '../../src/platform/tenant-provisioning/tenant-provisioning.service.js';

describe('Ed25519 License Signing & Verification (Task A1.5 - S3)', () => {
  let app: INestApplication;
  let systemPrisma: SystemPrisma;
  let provisioningService: TenantProvisioningService;

  let systemToken: string;
  let systemAdminId: string;
  let tenantCompanyId: string;
  const machineId = 'hw-mb-uuid-cpu-serial-disk-001';

  let generatedLicense: {
    licenseKey: string;
    signature: string;
    kid: string;
    plan: string;
    validUntil: string;
    maxSeats: number;
    machineId: string;
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

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot(config),
        ClsModule.forRoot({ global: true, middleware: { mount: true } }),
        DatabaseModule,
        PlatformModule,
        AdaptersModule,
        AuthModule,
        SystemAdminModule,
        LicenseModule,
        TenantProvisioningModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    const configService = moduleRef.get(ConfigService);
    configureApp(app, configService);
    await app.init();

    systemPrisma = moduleRef.get(SystemPrisma);
    provisioningService = moduleRef.get(TenantProvisioningService);

    // Bootstrap Super Admin
    await systemPrisma.executeWithReason(
      '// SYSTEM-SCOPE: Prepare clean system admin for test',
      async (client) => {
        await client.systemSession.deleteMany({});
        await client.systemAdmin.deleteMany({});
      },
    );

    const adminEmail = `licadmin-${Date.now()}@exzaestate.test`;
    const adminPassword = 'SuperAdminPassword@2026!';
    const reg = await request(app.getHttpServer())
      .post('/api/v1/system/auth/register-initial')
      .send({ email: adminEmail, fullName: 'Super Admin', password: adminPassword });
    systemAdminId = reg.body.data.id;

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

    // Provision a tenant
    const prov = await provisioningService.provisionCompany({
      name: 'Licensing Test Tenant Ltd.',
      code: `LIC${Date.now().toString().slice(-4)}`,
      branchName: 'Head Office',
      branchCode: 'HO',
      managingDirector: {
        email: `md-lic-${Date.now()}@exzaestate.test`,
        fullName: 'MD Licensing',
        password: 'Password123!Secure',
        isLocalMode: true,
      },
    });
    tenantCompanyId = prov.companyId;
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

  it('S3.1: Super Admin generates Ed25519-signed license for tenant', async () => {
    const validUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    const res = await request(app.getHttpServer())
      .post('/api/v1/system/licenses')
      .set('Authorization', `Bearer ${systemToken}`)
      .send({
        companyId: tenantCompanyId,
        plan: 'ENTERPRISE',
        validUntil,
        maxSeats: 25,
        maxBranches: 3,
        maxProjects: 10,
        machineId,
      })
      .expect(HttpStatus.CREATED);

    expect(res.body.success).toBe(true);
    expect(res.body.data.licenseKey).toBeDefined();
    expect(res.body.data.signature).toBeDefined();
    expect(res.body.data.kid).toBeDefined();
    expect(res.body.data.plan).toBe('ENTERPRISE');
    expect(res.body.data.maxSeats).toBe(25);

    generatedLicense = res.body.data;
  });

  it('S3.2: POST /api/v1/license/verify successfully verifies signed active license', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/license/verify')
      .send({
        companyId: tenantCompanyId,
        licenseKey: generatedLicense.licenseKey,
        signature: generatedLicense.signature,
        machineId,
      })
      .expect(HttpStatus.OK);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ACTIVE');
    expect(res.body.data.plan).toBe('ENTERPRISE');
    expect(res.body.data.maxSeats).toBe(25);
  });

  it('S3.3: Verification rejects tampered license payload (LICENSE_INVALID)', async () => {
    // Tamper by providing mismatched signature
    const res = await request(app.getHttpServer())
      .post('/api/v1/license/verify')
      .send({
        companyId: tenantCompanyId,
        licenseKey: generatedLicense.licenseKey,
        signature: 'invalid_base64_tampered_signature_content_1234567890',
        machineId,
      })
      .expect(HttpStatus.FORBIDDEN);

    expect(res.body.error.code).toBe('LICENSE_INVALID');
  });

  it('S3.4: Verification rejects mismatched hardware machineId (LICENSE_INVALID)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/license/verify')
      .send({
        companyId: tenantCompanyId,
        licenseKey: generatedLicense.licenseKey,
        signature: generatedLicense.signature,
        machineId: 'completely-different-hardware-fingerprint-999',
      })
      .expect(HttpStatus.FORBIDDEN);

    expect(res.body.error.code).toBe('LICENSE_INVALID');
  });

  it('S3.5: Expired license within 15-day grace period returns GRACE with days remaining', async () => {
    // Generate a license that expired 5 days ago (grace period is 15 days)
    const expiredPast5Days = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();

    const genRes = await request(app.getHttpServer())
      .post('/api/v1/system/licenses')
      .set('Authorization', `Bearer ${systemToken}`)
      .send({
        companyId: tenantCompanyId,
        plan: 'STANDARD',
        validUntil: expiredPast5Days,
        maxSeats: 5,
        machineId,
      })
      .expect(HttpStatus.CREATED);

    const res = await request(app.getHttpServer())
      .post('/api/v1/license/verify')
      .send({
        companyId: tenantCompanyId,
        licenseKey: genRes.body.data.licenseKey,
        signature: genRes.body.data.signature,
        machineId,
      })
      .expect(HttpStatus.OK);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('GRACE');
    expect(res.body.data.graceDaysRemaining).toBeGreaterThanOrEqual(9);
    expect(res.body.data.graceDaysRemaining).toBeLessThanOrEqual(10);
  });

  it('S3.6: Expired license past 15-day grace period returns EXPIRED', async () => {
    // Generate a license that expired 20 days ago (past 15-day grace period)
    const expiredPast20Days = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString();

    const genRes = await request(app.getHttpServer())
      .post('/api/v1/system/licenses')
      .set('Authorization', `Bearer ${systemToken}`)
      .send({
        companyId: tenantCompanyId,
        plan: 'STANDARD',
        validUntil: expiredPast20Days,
        maxSeats: 5,
        machineId,
      })
      .expect(HttpStatus.CREATED);

    const res = await request(app.getHttpServer())
      .post('/api/v1/license/verify')
      .send({
        companyId: tenantCompanyId,
        licenseKey: genRes.body.data.licenseKey,
        signature: genRes.body.data.signature,
        machineId,
      })
      .expect(HttpStatus.FORBIDDEN);

    expect(res.body.error.code).toBe('LICENSE_EXPIRED');
  });
});
