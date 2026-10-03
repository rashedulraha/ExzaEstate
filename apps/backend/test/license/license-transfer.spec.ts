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

describe('License Hardware Transfer & Audit (Task A1.5 - S5)', () => {
  let app: INestApplication;
  let systemPrisma: SystemPrisma;
  let provisioningService: TenantProvisioningService;

  let systemToken: string;
  let tenantCompanyId: string;
  let activeLicenseKey: string;

  const originalHardware = {
    motherboardSerial: 'MB-SER-1111',
    cpuId: 'CPU-ID-2222',
    diskSerial: 'DISK-SER-3333',
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
      '// SYSTEM-SCOPE: Prepare clean system admin for transfer test',
      async (client) => {
        await client.systemSession.deleteMany({});
        await client.systemAdmin.deleteMany({});
      },
    );

    const adminEmail = `transfer-admin-${Date.now()}@exzaestate.test`;
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

    // Provision a tenant company
    const prov = await provisioningService.provisionCompany({
      name: 'Transfer Test Ltd.',
      code: `TRF${Date.now().toString().slice(-4)}`,
      branchName: 'Main Branch',
      branchCode: 'MB',
      managingDirector: {
        email: `md-trf-${Date.now()}@exzaestate.test`,
        fullName: 'MD Transfer',
        password: 'Password123!Secure',
        isLocalMode: true,
      },
    });
    tenantCompanyId = prov.companyId;

    // Issue initial license
    const validUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const licRes = await request(app.getHttpServer())
      .post('/api/v1/system/licenses')
      .set('Authorization', `Bearer ${systemToken}`)
      .send({
        companyId: tenantCompanyId,
        plan: 'ENTERPRISE',
        validUntil,
        maxSeats: 10,
        machineId: 'MACHINE-ORIGINAL-001',
      })
      .expect(HttpStatus.CREATED);

    activeLicenseKey = licRes.body.data.licenseKey;
  });

  afterAll(async () => {
    await app.close();
  });

  it('S5.1: Rejects transfer when hardware fingerprint matches fewer than 2 of 3 components (Gate D-15)', async () => {
    // Only disk matches (1 out of 3 components)
    const mismatchedHardware = {
      motherboardSerial: 'MB-DIFFERENT-9999',
      cpuId: 'CPU-DIFFERENT-8888',
      diskSerial: originalHardware.diskSerial,
    };

    const res = await request(app.getHttpServer())
      .post('/api/v1/license/transfer-request')
      .send({
        companyId: tenantCompanyId,
        licenseKey: activeLicenseKey,
        newMachineId: 'MACHINE-REJECTED-002',
        previousHardware: originalHardware,
        newHardware: mismatchedHardware,
        reason: 'Attempted migration to completely new rig',
      })
      .expect(HttpStatus.FORBIDDEN);

    expect(res.body.error.code).toBe('LICENSE_INVALID');
  });

  it('S5.2: Approves transfer when hardware fingerprint matches >= 2 of 3 components (Gate D-15)', async () => {
    // Motherboard and CPU match, replaced disk (2 out of 3 components)
    const upgradedDiskHardware = {
      motherboardSerial: originalHardware.motherboardSerial,
      cpuId: originalHardware.cpuId,
      diskSerial: 'DISK-NEW-SSD-9999',
    };

    const res = await request(app.getHttpServer())
      .post('/api/v1/license/transfer-request')
      .send({
        companyId: tenantCompanyId,
        licenseKey: activeLicenseKey,
        newMachineId: 'MACHINE-UPGRADED-003',
        previousHardware: originalHardware,
        newHardware: upgradedDiskHardware,
        reason: 'Disk replacement SSD upgrade',
      })
      .expect(HttpStatus.OK);

    expect(res.body.success).toBe(true);
    expect(res.body.data.machineId).toBe('MACHINE-UPGRADED-003');

    // Verify audit entry in license_transfers table
    const transferLogs = await systemPrisma.executeWithReason(
      '// SYSTEM-SCOPE: Check license transfer audit table',
      async (client) => {
        return client.licenseTransfer.findMany({
          where: { companyId: tenantCompanyId },
        });
      },
    );

    expect(transferLogs.length).toBe(1);
    expect(transferLogs[0]?.newMachineId).toBe('MACHINE-UPGRADED-003');
    expect(transferLogs[0]?.status).toBe('COMPLETED');
  });

  it('S5.3: Enforces annual limit of 2 transfers per year (Gate D-15)', async () => {
    // Second transfer in the same year (2 of 3 components match)
    const secondUpgrade = {
      motherboardSerial: originalHardware.motherboardSerial,
      cpuId: 'CPU-NEW-4444',
      diskSerial: originalHardware.diskSerial,
    };

    await request(app.getHttpServer())
      .post('/api/v1/license/transfer-request')
      .send({
        companyId: tenantCompanyId,
        licenseKey: activeLicenseKey,
        newMachineId: 'MACHINE-UPGRADED-004',
        previousHardware: originalHardware,
        newHardware: secondUpgrade,
        reason: 'Second transfer of the year',
      })
      .expect(HttpStatus.OK);

    // 3rd transfer within the same year should be blocked (limit is 2/yr)
    const thirdUpgrade = {
      motherboardSerial: originalHardware.motherboardSerial,
      cpuId: originalHardware.cpuId,
      diskSerial: 'DISK-ANOTHER-7777',
    };

    const blockedRes = await request(app.getHttpServer())
      .post('/api/v1/license/transfer-request')
      .send({
        companyId: tenantCompanyId,
        licenseKey: activeLicenseKey,
        newMachineId: 'MACHINE-UPGRADED-005',
        previousHardware: originalHardware,
        newHardware: thirdUpgrade,
        reason: 'Third transfer attempt exceeding 2/yr limit',
      })
      .expect(HttpStatus.FORBIDDEN);

    expect(blockedRes.body.error.message).toContain('maximum 2 transfers per year');
  });
});
