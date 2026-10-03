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
import { SETTINGS_CATALOGUE } from '../../src/modules/settings/settings.catalogue.js';
import { PlatformModule } from '../../src/platform/platform.module.js';
import { TenantProvisioningService } from '../../src/platform/tenant-provisioning/tenant-provisioning.service.js';
import { TenantProvisioningModule } from '../../src/platform/tenant-provisioning/tenant-provisioning.module.js';

describe('S2: Typed Settings Catalogue & Validation (Tier 2)', () => {
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

    const provisionRes = await provisioningService.provisionCompany({
      name: 'Exza Living Settings Corp',
      code: `EXZASTG${Date.now().toString().slice(-4)}`,
      branchName: 'Head Office Gulshan',
      branchCode: 'DHK',
      managingDirector: {
        email: `md-stg-${Date.now()}@exzaliving.com`,
        fullName: 'Settings Director',
        password: 'Password123!Secure',
        isLocalMode: true,
      },
    });

    companyId = provisionRes.companyId;
    mdUserId = provisionRes.managingDirectorUserId;

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

  it('reads all 34 configuration catalogue settings with default values', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/settings')
      .set('Authorization', `Bearer ${mdToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    const settings = res.body.data;

    const catalogueKeys = Object.keys(SETTINGS_CATALOGUE);
    expect(catalogueKeys.length).toBe(34);

    for (const key of catalogueKeys) {
      expect(settings).toHaveProperty(key);
      expect(settings[key]).toEqual(SETTINGS_CATALOGUE[key]!.defaultValue);
    }
  });

  it('reads an individual setting with correct typed default', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/settings/land_unit_factors')
      .set('Authorization', `Bearer ${mdToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({
      decimal: 435.6,
      acre: 43560,
      katha: 720,
      bigha: 14400,
    });
  });

  it('validates setting updates via Zod schema and rejects invalid values (VALIDATION_ERROR)', async () => {
    const invalidMonthRes = await request(app.getHttpServer())
      .put('/api/v1/settings/fiscal_year_start_month')
      .set('Authorization', `Bearer ${mdToken}`)
      .send({ value: 13 })
      .expect(400);

    expect(invalidMonthRes.body.error.code).toBe('VALIDATION_ERROR');

    const invalidDeductionRes = await request(app.getHttpServer())
      .put('/api/v1/settings/cancellation_deduction_pct')
      .set('Authorization', `Bearer ${mdToken}`)
      .send({ value: 150 })
      .expect(400);

    expect(invalidDeductionRes.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects updating an unknown configuration key with NOT_FOUND', async () => {
    const res = await request(app.getHttpServer())
      .put('/api/v1/settings/unknown_non_existent_key')
      .set('Authorization', `Bearer ${mdToken}`)
      .send({ value: 'foo' })
      .expect(404);

    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('updates a non-sensitive setting and writes an audit log with before/after', async () => {
    const updateRes = await request(app.getHttpServer())
      .put('/api/v1/settings/reservation_hold_hours')
      .set('Authorization', `Bearer ${mdToken}`)
      .send({ value: 96 })
      .expect(200);

    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.value).toBe(96);

    const getRes = await request(app.getHttpServer())
      .get('/api/v1/settings/reservation_hold_hours')
      .set('Authorization', `Bearer ${mdToken}`)
      .expect(200);

    expect(getRes.body.data).toBe(96);

    await tenantDb.withCompany(companyId, async (tx) => {
      const logs = await tx.$queryRawUnsafe<
        Array<{
          action: string;
          old_value: Record<string, unknown> | string;
          new_value: Record<string, unknown> | string;
        }>
      >(
        `SELECT action, old_value, new_value FROM audit_logs WHERE company_id = $1::uuid AND action = 'SETTING_UPDATED' ORDER BY created_at DESC LIMIT 1`,
        companyId,
      );
      expect(logs.length).toBe(1);
      const rawOld = logs[0]!.old_value;
      const rawNew = logs[0]!.new_value;
      const oldVal =
        typeof rawOld === 'string' ? (JSON.parse(rawOld) as Record<string, unknown>) : rawOld;
      const newVal =
        typeof rawNew === 'string' ? (JSON.parse(rawNew) as Record<string, unknown>) : rawNew;
      expect(oldVal.value).toBe(72);
      expect(newVal.value).toBe(96);
    });
  });
});
