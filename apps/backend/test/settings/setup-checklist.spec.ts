import type { INestApplication } from '@nestjs/common';
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
import { TenantDb } from '../../src/database/tenant-db.service.js';
import { AuthModule } from '../../src/modules/auth/auth.module.js';
import { TokenService } from '../../src/modules/auth/token.service.js';
import { SettingsModule } from '../../src/modules/settings/settings.module.js';
import { PlatformModule } from '../../src/platform/platform.module.js';
import { TenantProvisioningService } from '../../src/platform/tenant-provisioning/tenant-provisioning.service.js';
import { TenantProvisioningModule } from '../../src/platform/tenant-provisioning/tenant-provisioning.module.js';

describe('S4: Setup-Checklist Endpoint & Provisioning Steps (Tier 2)', () => {
  let app: INestApplication;
  let tenantDb: TenantDb;
  let tokenService: TokenService;
  let provisioningService: TenantProvisioningService;

  let companyId: string;
  let mdUserId: string;
  let mdToken: string;

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
        ClsModule.forRoot({
          global: true,
          middleware: { mount: true },
        }),
        DatabaseModule,
        AdaptersModule.forRoot('cloud'),
        PlatformModule,
        AuthModule,
        SettingsModule,
        TenantProvisioningModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    const configService = moduleRef.get(ConfigService);
    configureApp(app, configService);
    await app.init();

    tenantDb = moduleRef.get(TenantDb);
    tokenService = moduleRef.get(TokenService);
    provisioningService = moduleRef.get(TenantProvisioningService);

    // 1. Provision company - runs all registered steps including departments, settings, and numbering
    const provisionRes = await provisioningService.provisionCompany({
      name: 'Exza Living Flow02 Corp',
      code: `EXZAFLW${Date.now().toString().slice(-4)}`,
      branchName: 'Head Office Gulshan',
      branchCode: 'DHK',
      managingDirector: {
        email: `md-flw-${Date.now()}@exzaliving.com`,
        fullName: 'Flow02 Director',
        password: 'Password123!Secure',
        isLocalMode: true,
      },
    });

    companyId = provisionRes.companyId;
    mdUserId = provisionRes.managingDirectorUserId;

    // 2. Active MD session with 2FA
    const mdSession = await tenantDb.withCompany(companyId, async (tx) => {
      await tx.user.update({
        where: { id: mdUserId },
        data: {
          status: 'ACTIVE',
          isTwoFactorEnabled: true,
        },
      });

      return tx.session.create({
        data: {
          companyId,
          userId: mdUserId,
          familyId: crypto.randomUUID(),
        },
      });
    });

    mdToken = tokenService.generateAccessToken({
      sub: mdUserId,
      companyId,
      sid: mdSession.id,
    });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  // ---------------------------------------------------------------------------
  // Provisioning Steps Verification
  // ---------------------------------------------------------------------------

  it('provisions default departments during company onboarding', async () => {
    await tenantDb.withCompany(companyId, async (tx) => {
      const depts = await tx.department.findMany({
        where: { companyId, deletedAt: null },
      });

      expect(depts.length).toBeGreaterThanOrEqual(5);
      const codes = depts.map((d) => d.code);
      expect(codes).toContain('ADMIN');
      expect(codes).toContain('SALES');
      expect(codes).toContain('ACCOUNTS');
      expect(codes).toContain('ENGINEERING');
      expect(codes).toContain('CUSTOMER_CARE');
    });
  });

  it('provisions default configuration settings during company onboarding', async () => {
    await tenantDb.withCompany(companyId, async (tx) => {
      const count = await tx.companySetting.count({
        where: { companyId },
      });

      expect(count).toBeGreaterThanOrEqual(30);

      const rev = await tx.companySetting.findUnique({
        where: { companyId_key: { companyId, key: 'revenue_recognition' } },
      });
      expect(rev?.value).toBe('ON_BOOKING');
    });
  });

  it('provisions default numbering patterns during company onboarding', async () => {
    await tenantDb.withCompany(companyId, async (tx) => {
      const patterns = await tx.numberingPattern.findMany({
        where: { companyId },
      });

      expect(patterns.length).toBeGreaterThanOrEqual(13);

      const rcpt = patterns.find((p) => p.documentType === 'RECEIPT');
      expect(rcpt).toBeDefined();
      expect(rcpt?.pattern).toBe('RCPT-{BRANCH}-{YEAR}-{SEQ:6}');
      expect(rcpt?.resetRule).toBe('YEARLY');
    });
  });

  // ---------------------------------------------------------------------------
  // Setup Checklist Endpoint
  // ---------------------------------------------------------------------------

  it('returns FLOW-02 setup checklist progress and canTransact status', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/setup/checklist')
      .set('Authorization', `Bearer ${mdToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    const data = res.body.data;

    expect(data.totalCount).toBe(6);
    expect(data.percentage).toBeGreaterThanOrEqual(80);
    expect(data.items.length).toBe(6);

    const keys = data.items.map((i: { key: string }) => i.key);
    expect(keys).toContain('COMPANY_PROFILE');
    expect(keys).toContain('BRANCHES');
    expect(keys).toContain('DEPARTMENTS');
    expect(keys).toContain('POLICY_SETTINGS');
    expect(keys).toContain('NUMBERING_PATTERNS');
    expect(keys).toContain('USERS_ROLES');
  });
});
