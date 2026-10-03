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
import { CompanyModule } from '../../src/modules/company/company.module.js';
import { PlatformModule } from '../../src/platform/platform.module.js';
import { TenantProvisioningService } from '../../src/platform/tenant-provisioning/tenant-provisioning.service.js';
import { TenantProvisioningModule } from '../../src/platform/tenant-provisioning/tenant-provisioning.module.js';

describe('Branch CRUD, Scope Filtering and Soft Deletion', () => {
  let app: INestApplication;
  let tenantDb: TenantDb;
  let tokenService: TokenService;
  let provisioningService: TenantProvisioningService;

  let companyId: string;
  let mdUserId: string;
  let mdToken: string;
  let branchUserToken: string;
  let headOfficeBranchId: string;
  let branch2Id: string;

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

    tenantDb = moduleRef.get(TenantDb);
    tokenService = moduleRef.get(TokenService);
    provisioningService = moduleRef.get(TenantProvisioningService);

    // 1. Provision a test company
    const provisionRes = await provisioningService.provisionCompany({
      name: 'Exza Living Real Estate Ltd',
      code: `EXZABR${Date.now().toString().slice(-4)}`,
      branchName: 'Head Office Gulshan',
      branchCode: 'DHK-HO',
      managingDirector: {
        email: `md-br-${Date.now()}@exzaliving.com`,
        fullName: 'Rashedul MD',
        password: 'Password123!Secure',
        isLocalMode: true,
      },
    });

    companyId = provisionRes.companyId;
    mdUserId = provisionRes.managingDirectorUserId;
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

    // 2. Create Branch 2 (Chattogram Branch)
    const b2 = await tenantDb.withCompany(companyId, async (tx) => {
      return tx.branch.create({
        data: {
          companyId,
          name: 'Chattogram Branch',
          code: 'CTG-01',
          isHeadOffice: false,
          isActive: true,
        },
      });
    });
    branch2Id = b2.id;

    // 3. Create a branch-scoped user
    await tenantDb.withCompany(companyId, async (tx) => {
      const u = await tx.user.create({
        data: {
          companyId,
          email: `branchuser-${Date.now()}@exzaliving.com`,
          fullName: 'Chittagong Staff',
          passwordHash: 'dummyhash',
          status: 'ACTIVE',
        },
      });

      await tx.userBranch.create({
        data: {
          companyId,
          userId: u.id,
          branchId: branch2Id,
          isDefault: true,
        },
      });

      const role = await tx.role.create({
        data: {
          companyId,
          name: 'Branch Staff Role',
          code: `BRANCH_ROLE_${Date.now()}`,
          isSystem: false,
        },
      });

      await tx.rolePermission.create({
        data: {
          companyId,
          roleId: role.id,
          permissionCode: PERMISSIONS.BRANCH_VIEW,
          scope: 'BRANCH',
        },
      });

      await tx.userRole.create({
        data: {
          companyId,
          userId: u.id,
          roleId: role.id,
        },
      });

      const session = await tx.session.create({
        data: {
          companyId,
          userId: u.id,
          familyId: crypto.randomUUID(),
        },
      });

      branchUserToken = tokenService.generateAccessToken({
        sub: u.id,
        companyId,
        sid: session.id,
      });
    });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('lists branches respecting user data scope (ALL vs BRANCH)', async () => {
    const mdRes = await request(app.getHttpServer())
      .get('/api/v1/company/branches')
      .set('Authorization', `Bearer ${mdToken}`)
      .expect(200);

    expect(mdRes.body.success).toBe(true);
    expect(mdRes.body.data.length).toBeGreaterThanOrEqual(2);

    const branchRes = await request(app.getHttpServer())
      .get('/api/v1/company/branches')
      .set('Authorization', `Bearer ${branchUserToken}`)
      .expect(200);

    expect(branchRes.body.success).toBe(true);
    expect(branchRes.body.data.length).toBe(1);
    expect(branchRes.body.data[0].id).toBe(branch2Id);
  });

  it('rejects access when a branch-scoped user requests a forbidden branch', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/company/branches/${headOfficeBranchId}`)
      .set('Authorization', `Bearer ${branchUserToken}`)
      .expect(403);

    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('creates a new branch and blocks duplicate branch code in the same company', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/company/branches')
      .set('Authorization', `Bearer ${mdToken}`)
      .send({
        name: 'Uttara Sales Hub',
        code: 'UTR-01',
        phone: '+8801811223344',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.code).toBe('UTR-01');

    const duplicateRes = await request(app.getHttpServer())
      .post('/api/v1/company/branches')
      .set('Authorization', `Bearer ${mdToken}`)
      .send({
        name: 'Another Uttara Office',
        code: 'UTR-01',
      })
      .expect(409);

    expect(duplicateRes.body.error.code).toBe('CONFLICT');
  });

  it('prevents deleting the Head Office branch or the only branch', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/company/branches/${headOfficeBranchId}`)
      .set('Authorization', `Bearer ${mdToken}`)
      .expect(400);

    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toContain('Head Office');
  });

  it('soft-deletes a non-head-office branch and marks it inactive with deletedAt', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/company/branches')
      .set('Authorization', `Bearer ${mdToken}`)
      .send({
        name: 'Sylhet Branch',
        code: 'SYL-01',
      })
      .expect(201);

    const sylhetId = createRes.body.data.id;

    const delRes = await request(app.getHttpServer())
      .delete(`/api/v1/company/branches/${sylhetId}`)
      .set('Authorization', `Bearer ${mdToken}`)
      .expect(200);

    expect(delRes.body.success).toBe(true);

    const listRes = await request(app.getHttpServer())
      .get('/api/v1/company/branches')
      .set('Authorization', `Bearer ${mdToken}`)
      .expect(200);

    const ids = listRes.body.data.map((b: { id: string }) => b.id);
    expect(ids).not.toContain(sylhetId);

    await tenantDb.withCompany(companyId, async (tx) => {
      const dbRecord = await tx.branch.findUnique({ where: { id: sylhetId } });
      expect(dbRecord?.deletedAt).not.toBeNull();
      expect(dbRecord?.isActive).toBe(false);
    });
  });
});
