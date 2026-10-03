import type { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ClsModule } from 'nestjs-cls';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PERMISSIONS } from '@exzaestate/shared';
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

describe('Sensitive Settings: Step-up and Permissions (Tier 2)', () => {
  let app: INestApplication;
  let tenantDb: TenantDb;
  let tokenService: TokenService;
  let provisioningService: TenantProvisioningService;

  let companyId: string;
  let mdUserId: string;
  let mdSessionId: string;
  let mdToken: string;

  let staffSessionId: string;
  let staffToken: string;

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
      name: 'Exza Living Sensitive Settings Corp',
      code: `EXZASEN${Date.now().toString().slice(-4)}`,
      branchName: 'Head Office Gulshan',
      branchCode: 'DHK',
      managingDirector: {
        email: `md-sen-${Date.now()}@exzaliving.com`,
        fullName: 'Sensitive Settings Director',
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

    mdSessionId = mdSession.id;
    mdToken = tokenService.generateAccessToken({
      sub: mdUserId,
      companyId,
      sid: mdSession.id,
    });

    await tenantDb.withCompany(companyId, async (tx) => {
      const u = await tx.user.create({
        data: {
          companyId,
          email: `staff-sen-${Date.now()}@exzaliving.com`,
          fullName: 'Staff Settings Editor',
          passwordHash: 'dummy',
          status: 'ACTIVE',
          isTwoFactorEnabled: true,
        },
      });

      const role = await tx.role.create({
        data: {
          companyId,
          name: 'Settings Editor Role',
          code: `STG_EDIT_${Date.now()}`,
          isSystem: false,
        },
      });

      await tx.rolePermission.create({
        data: {
          companyId,
          roleId: role.id,
          permissionCode: PERMISSIONS.SETTINGS_EDIT,
          scope: 'ALL',
        },
      });

      await tx.userRole.create({
        data: {
          companyId,
          userId: u.id,
          roleId: role.id,
        },
      });

      const s = await tx.session.create({
        data: {
          companyId,
          userId: u.id,
          familyId: crypto.randomUUID(),
        },
      });

      staffSessionId = s.id;
      staffToken = tokenService.generateAccessToken({
        sub: u.id,
        companyId,
        sid: s.id,
      });
    });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('blocks updating sensitive keys without step-up authentication (STEP_UP_REQUIRED)', async () => {
    const res = await request(app.getHttpServer())
      .put('/api/v1/settings/revenue_recognition')
      .set('Authorization', `Bearer ${mdToken}`)
      .send({ value: 'ON_HANDOVER' })
      .expect(403);

    expect(res.body.error.code).toBe('STEP_UP_REQUIRED');
  });

  it('blocks updating sensitive keys when user lacks settings:manage permission', async () => {
    await tenantDb.withCompany(companyId, async (tx) => {
      await tx.session.update({
        where: { id: staffSessionId },
        data: { stepUpUntil: new Date(Date.now() + 10 * 60 * 1000) },
      });
    });

    const res = await request(app.getHttpServer())
      .put('/api/v1/settings/revenue_recognition')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ value: 'ON_AGREEMENT' })
      .expect(403);

    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toContain('settings:manage');
  });

  it('permits updating sensitive keys once user has settings:manage AND active step-up', async () => {
    await tenantDb.withCompany(companyId, async (tx) => {
      await tx.session.update({
        where: { id: mdSessionId },
        data: { stepUpUntil: new Date(Date.now() + 10 * 60 * 1000) },
      });
    });

    const res = await request(app.getHttpServer())
      .put('/api/v1/settings/revenue_recognition')
      .set('Authorization', `Bearer ${mdToken}`)
      .send({ value: 'ON_HANDOVER' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.value).toBe('ON_HANDOVER');

    const readRes = await request(app.getHttpServer())
      .get('/api/v1/settings/revenue_recognition')
      .set('Authorization', `Bearer ${mdToken}`)
      .expect(200);

    expect(readRes.body.data).toBe('ON_HANDOVER');
  });
});
