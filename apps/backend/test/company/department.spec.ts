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
import { CompanyModule } from '../../src/modules/company/company.module.js';
import { PlatformModule } from '../../src/platform/platform.module.js';
import { TenantProvisioningService } from '../../src/platform/tenant-provisioning/tenant-provisioning.service.js';
import { TenantProvisioningModule } from '../../src/platform/tenant-provisioning/tenant-provisioning.module.js';

describe('Department CRUD, Branch Filter and Soft Deletion', () => {
  let app: INestApplication;
  let tokenService: TokenService;
  let provisioningService: TenantProvisioningService;

  let mdToken: string;
  let headOfficeBranchId: string;

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
        CompanyModule,
        TenantProvisioningModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    const configService = moduleRef.get(ConfigService);
    configureApp(app, configService);
    await app.init();

    const tenantDb = moduleRef.get(TenantDb);
    tokenService = moduleRef.get(TokenService);
    provisioningService = moduleRef.get(TenantProvisioningService);

    const provisionRes = await provisioningService.provisionCompany({
      name: 'Exza Living Real Estate Ltd',
      code: `EXZADEPT${Date.now().toString().slice(-4)}`,
      branchName: 'Head Office Gulshan',
      branchCode: 'DHK-HO',
      managingDirector: {
        email: `md-dept-${Date.now()}@exzaliving.com`,
        fullName: 'Rashedul MD',
        password: 'Password123!Secure',
        isLocalMode: true,
      },
    });

    const companyId = provisionRes.companyId;
    const mdUserId = provisionRes.managingDirectorUserId;
    headOfficeBranchId = provisionRes.branchId;

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

  it('creates, lists, updates, and soft-deletes departments', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/company/departments')
      .set('Authorization', `Bearer ${mdToken}`)
      .send({
        name: 'Legal & Compliance',
        code: 'LEGAL',
        branchId: headOfficeBranchId,
      })
      .expect(201);

    expect(createRes.body.success).toBe(true);
    const deptId = createRes.body.data.id;
    expect(createRes.body.data.code).toBe('LEGAL');

    await request(app.getHttpServer())
      .post('/api/v1/company/departments')
      .set('Authorization', `Bearer ${mdToken}`)
      .send({
        name: 'Legal Duplicate',
        code: 'LEGAL',
      })
      .expect(409);

    const listRes = await request(app.getHttpServer())
      .get(`/api/v1/company/departments?branchId=${headOfficeBranchId}`)
      .set('Authorization', `Bearer ${mdToken}`)
      .expect(200);

    expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);
    expect(listRes.body.data.some((d: { id: string }) => d.id === deptId)).toBe(true);

    const updateRes = await request(app.getHttpServer())
      .patch(`/api/v1/company/departments/${deptId}`)
      .set('Authorization', `Bearer ${mdToken}`)
      .send({
        name: 'Legal & Regulatory Affairs',
      })
      .expect(200);

    expect(updateRes.body.data.name).toBe('Legal & Regulatory Affairs');

    await request(app.getHttpServer())
      .delete(`/api/v1/company/departments/${deptId}`)
      .set('Authorization', `Bearer ${mdToken}`)
      .expect(200);

    const afterDeleteRes = await request(app.getHttpServer())
      .get('/api/v1/company/departments')
      .set('Authorization', `Bearer ${mdToken}`)
      .expect(200);

    const activeDeptIds = afterDeleteRes.body.data.map((d: { id: string }) => d.id);
    expect(activeDeptIds).not.toContain(deptId);
  });
});
