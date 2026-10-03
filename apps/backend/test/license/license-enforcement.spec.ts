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
import { LicenseModule } from '../../src/modules/license/license.module.js';
import { ProjectModule } from '../../src/modules/project/project.module.js';
import { SystemAdminModule } from '../../src/modules/system-admin/system-admin.module.js';
import { PlatformModule } from '../../src/platform/platform.module.js';
import { TenantProvisioningModule } from '../../src/platform/tenant-provisioning/tenant-provisioning.module.js';
import { TenantProvisioningService } from '../../src/platform/tenant-provisioning/tenant-provisioning.service.js';

describe('License Enforcement: Grace Period, Read-Only Mode & Seat Limit (Task A1.5 - S4)', () => {
  let app: INestApplication;
  let systemPrisma: SystemPrisma;
  let provisioningService: TenantProvisioningService;

  let systemToken: string;
  let tenantCompanyId: string;
  let tenantToken: string;
  let mdUserId: string;

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
        ProjectModule,
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
      '// SYSTEM-SCOPE: Prepare clean system admin for enforcement test',
      async (client) => {
        await client.systemSession.deleteMany({});
        await client.systemAdmin.deleteMany({});
      },
    );

    const adminEmail = `licenf-admin-${Date.now()}@exzaestate.test`;
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

    // Provision a tenant company with Managing Director
    const mdEmail = `md-enf-${Date.now()}@exzaestate.test`;
    const mdPassword = 'Password123!Secure';
    const prov = await provisioningService.provisionCompany({
      name: 'Enforcement Test Ltd.',
      code: `ENF${Date.now().toString().slice(-4)}`,
      branchName: 'Main Branch',
      branchCode: 'MB',
      managingDirector: {
        email: mdEmail,
        fullName: 'MD Enforcement',
        password: mdPassword,
        isLocalMode: true,
      },
    });
    tenantCompanyId = prov.companyId;
    mdUserId = prov.managingDirectorUserId;

    // Enable 2FA on MD user so permissions guard allows access
    const tenantDb = moduleRef.get(TenantDb);
    await tenantDb.withCompany(tenantCompanyId, async (tx) => {
      await tx.user.update({
        where: { id: mdUserId },
        data: { isTwoFactorEnabled: true },
      });
    });

    // Login as MD to get tenant token
    const tenantLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: mdEmail, password: mdPassword })
      .expect(HttpStatus.OK);
    tenantToken = tenantLoginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('S4.1: Active license permits reads and writes with X-License-Status: ACTIVE', async () => {
    // Issue active license
    const validUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    await request(app.getHttpServer())
      .post('/api/v1/system/licenses')
      .set('Authorization', `Bearer ${systemToken}`)
      .send({
        companyId: tenantCompanyId,
        plan: 'ENTERPRISE',
        validUntil,
        maxSeats: 10,
      })
      .expect(HttpStatus.CREATED);

    const getRes = await request(app.getHttpServer())
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${tenantToken}`)
      .expect(HttpStatus.OK);
    expect(getRes.headers['x-license-status']).toBe('ACTIVE');

    const createRes = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({
        name: 'Active License Project',
        code: `PRJ${Date.now().toString().slice(-4)}`,
        type: 'RESIDENTIAL',
      })
      .expect(HttpStatus.CREATED);
    expect(createRes.body.success).toBe(true);
  });

  it('S4.2: License within 15-day grace period permits writes with X-License-Status: GRACE', async () => {
    // Delete existing license and create one expired 5 days ago (10 days remaining in grace)
    await systemPrisma.executeWithReason(
      '// SYSTEM-SCOPE: Update license to grace period',
      async (client) => {
        await client.license.deleteMany({ where: { companyId: tenantCompanyId } });
      },
    );

    const expired5DaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    await request(app.getHttpServer())
      .post('/api/v1/system/licenses')
      .set('Authorization', `Bearer ${systemToken}`)
      .send({
        companyId: tenantCompanyId,
        plan: 'STANDARD',
        validUntil: expired5DaysAgo,
        maxSeats: 10,
      })
      .expect(HttpStatus.CREATED);

    const res = await request(app.getHttpServer())
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${tenantToken}`)
      .expect(HttpStatus.OK);

    expect(res.headers['x-license-status']).toBe('GRACE');
    expect(res.headers['x-license-grace-days-remaining']).toBeDefined();
  });

  it('S4.3: License expired past grace enforces read-only mode (reads allowed, writes blocked)', async () => {
    // Update license to expired 20 days ago (past 15-day grace)
    await systemPrisma.executeWithReason(
      '// SYSTEM-SCOPE: Update license to expired past grace',
      async (client) => {
        await client.license.deleteMany({ where: { companyId: tenantCompanyId } });
      },
    );

    const expired20DaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString();
    await request(app.getHttpServer())
      .post('/api/v1/system/licenses')
      .set('Authorization', `Bearer ${systemToken}`)
      .send({
        companyId: tenantCompanyId,
        plan: 'STANDARD',
        validUntil: expired20DaysAgo,
        maxSeats: 10,
      })
      .expect(HttpStatus.CREATED);

    // Reads (GET) MUST succeed with EXPIRED-READ-ONLY status
    const getRes = await request(app.getHttpServer())
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${tenantToken}`)
      .expect(HttpStatus.OK);
    expect(getRes.headers['x-license-status']).toBe('EXPIRED-READ-ONLY');

    // Writes (POST) MUST fail with 403 LICENSE_EXPIRED
    const writeRes = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({
        name: 'Blocked Mutation Project',
        code: `BLK${Date.now().toString().slice(-4)}`,
        type: 'COMMERCIAL',
      })
      .expect(HttpStatus.FORBIDDEN);

    expect(writeRes.body.error.code).toBe('LICENSE_EXPIRED');
  });

  it('S4.4: Enforces seat limit on user creation (MAX_SEATS_EXCEEDED)', async () => {
    // Set active license with maxSeats: 1 (MD is already seat 1)
    await systemPrisma.executeWithReason(
      '// SYSTEM-SCOPE: Set 1-seat active license for tenant',
      async (client) => {
        await client.license.deleteMany({ where: { companyId: tenantCompanyId } });
      },
    );

    const validUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    await request(app.getHttpServer())
      .post('/api/v1/system/licenses')
      .set('Authorization', `Bearer ${systemToken}`)
      .send({
        companyId: tenantCompanyId,
        plan: 'STARTER',
        validUntil,
        maxSeats: 1,
      })
      .expect(HttpStatus.CREATED);

    // Adding a second user should exceed max_seats: 1
    const createSecondUserRes = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({
        email: `seat-overflow-${Date.now()}@exzaestate.test`,
        fullName: 'Second User Over Limit',
        password: 'Password123!Secure',
      })
      .expect(HttpStatus.FORBIDDEN);

    expect(createSecondUserRes.body.error.code).toBe('MAX_SEATS_EXCEEDED');
  });

  it('S4.5: Data is never deleted on license expiration (BR-20)', async () => {
    // Check that existing projects and company records still exist in database
    const projects = await systemPrisma.executeWithReason(
      '// SYSTEM-SCOPE: Verify data retention for tenant',
      async (client) => {
        return client.project.findMany({
          where: { companyId: tenantCompanyId },
        });
      },
    );
    expect(projects.length).toBeGreaterThan(0);
  });
});
