import type { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ClsModule } from 'nestjs-cls';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DATA_SCOPES, ERROR_CODES, PERMISSIONS } from '@exzaestate/shared';
import { AdaptersModule } from '../../src/adapters/adapters.module.js';
import { configureApp } from '../../src/bootstrap.js';
import { ConfigModule } from '../../src/config/config.module.js';
import { ConfigService } from '../../src/config/config.service.js';
import { validateEnv } from '../../src/config/env.schema.js';
import { DatabaseModule } from '../../src/database/database.module.js';
import { TenantDb } from '../../src/database/tenant-db.service.js';
import { AuthModule } from '../../src/modules/auth/auth.module.js';
import { PermissionService } from '../../src/modules/auth/permission.service.js';
import { TokenService } from '../../src/modules/auth/token.service.js';
import { PlatformModule } from '../../src/platform/platform.module.js';
import { TenantProvisioningModule } from '../../src/platform/tenant-provisioning/tenant-provisioning.module.js';
import { TenantProvisioningService } from '../../src/platform/tenant-provisioning/tenant-provisioning.service.js';

describe('Role Management (Step S1)', () => {
  let app: INestApplication;
  let tenantDb: TenantDb;
  let tokenService: TokenService;
  let permissionService: PermissionService;
  let provisioningService: TenantProvisioningService;
  let companyId: string;
  let mdUserId: string;
  let mdSessionId: string;
  let mdToken: string;
  let execUserId: string;
  let execToken: string;
  let createdRoleId: string;

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
        TenantProvisioningModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    const configService = moduleRef.get(ConfigService);
    configureApp(app, configService);
    await app.init();

    tenantDb = moduleRef.get(TenantDb);
    tokenService = moduleRef.get(TokenService);
    permissionService = moduleRef.get(PermissionService);
    provisioningService = moduleRef.get(TenantProvisioningService);

    const provisionResult = await provisioningService.provisionCompany({
      name: 'Role Test Ltd',
      code: `RL${Date.now().toString().slice(-4)}`,
      branchName: 'Head Office',
      branchCode: 'HO-01',
      managingDirector: {
        email: `admin_${Date.now()}@exzaestate.test`,
        fullName: 'Role Admin MD',
        password: 'Password123!Secure',
        isLocalMode: true,
      },
    });

    companyId = provisionResult.companyId;
    mdUserId = provisionResult.managingDirectorUserId;

    await tenantDb.withCompany(companyId, async (tx) => {
      await tx.user.update({
        where: { id: mdUserId, companyId },
        data: { isTwoFactorEnabled: true, twoFactorEnrolledAt: new Date() },
      });
    });

    const stepUpUntil = new Date(Date.now() + 5 * 60 * 1000);
    const mdSession = await tenantDb.withCompany(companyId, async (tx) => {
      return tx.session.create({
        data: { companyId, userId: mdUserId, familyId: crypto.randomUUID(), stepUpUntil },
      });
    });
    mdSessionId = mdSession.id;
    mdToken = tokenService.generateAccessToken({ sub: mdUserId, companyId, sid: mdSessionId });

    const execUser = await tenantDb.withCompany(companyId, async (tx) => {
      const exec = await tx.user.create({
        data: {
          companyId,
          email: `exec_${Date.now()}@exzaestate.test`,
          passwordHash: 'dummy',
          fullName: 'Exec',
          status: 'ACTIVE',
        },
      });
      const execRole = await tx.role.findFirst({ where: { companyId, code: 'EXECUTIVE' } });
      if (execRole) {
        await tx.userRole.create({ data: { companyId, userId: exec.id, roleId: execRole.id } });
      }
      return exec;
    });
    execUserId = execUser.id;

    const execSession = await tenantDb.withCompany(companyId, async (tx) => {
      return tx.session.create({
        data: { companyId, userId: execUserId, familyId: crypto.randomUUID() },
      });
    });
    execToken = tokenService.generateAccessToken({
      sub: execUserId,
      companyId,
      sid: execSession.id,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/roles - lists company roles for user with role:view', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/roles')
      .set('Authorization', `Bearer ${mdToken}`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    const codes = res.body.data.map((r: { code: string }) => r.code);
    expect(codes).toContain('MANAGING_DIRECTOR');
    expect(codes).toContain('EXECUTIVE');
  });

  it('POST /api/v1/roles - denies role creation for Executive (requires role:manage)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/roles')
      .set('Authorization', `Bearer ${execToken}`)
      .send({ code: 'SITE_MGR', name: 'Site Manager' })
      .expect(403);
    expect(res.body.error.code).toBe(ERROR_CODES.FORBIDDEN);
  });

  it('POST /api/v1/roles - denies creation without Step-Up authentication', async () => {
    const noStepUpSession = await tenantDb.withCompany(companyId, async (tx) => {
      return tx.session.create({
        data: { companyId, userId: mdUserId, familyId: crypto.randomUUID(), stepUpUntil: null },
      });
    });
    const noStepUpToken = tokenService.generateAccessToken({
      sub: mdUserId,
      companyId,
      sid: noStepUpSession.id,
    });
    const res = await request(app.getHttpServer())
      .post('/api/v1/roles')
      .set('Authorization', `Bearer ${noStepUpToken}`)
      .send({ code: 'SITE_MGR', name: 'Site Manager' })
      .expect(403);
    expect(res.body.error.code).toBe(ERROR_CODES.STEP_UP_REQUIRED);
  });

  it('POST /api/v1/roles - creates custom role with step-up by MD', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/roles')
      .set('Authorization', `Bearer ${mdToken}`)
      .send({
        code: 'SITE_ENG',
        name: 'Site Engineer',
        permissions: [{ permissionCode: PERMISSIONS.BRANCH_VIEW, scope: DATA_SCOPES.BRANCH }],
      })
      .expect(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.code).toBe('SITE_ENG');
    expect(res.body.data.isSystem).toBe(false);
    createdRoleId = res.body.data.id;
  });

  it('POST /api/v1/roles/:id/clone - clones existing role permissions into new custom role', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/roles/${createdRoleId}/clone`)
      .set('Authorization', `Bearer ${mdToken}`)
      .send({ newCode: 'SR_SITE_ENG', newName: 'Senior Site Engineer' })
      .expect(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.code).toBe('SR_SITE_ENG');
    expect(res.body.data.permissions[0].permissionCode).toBe(PERMISSIONS.BRANCH_VIEW);
  });

  it('PATCH /api/v1/roles/:id - updates role name and description', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/roles/${createdRoleId}`)
      .set('Authorization', `Bearer ${mdToken}`)
      .send({ name: 'Lead Site Engineer' })
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Lead Site Engineer');
  });

  it('PUT /api/v1/roles/:id/permissions - updates permissions and invalidates cache', async () => {
    await tenantDb.withCompany(companyId, async (tx) => {
      await tx.userRole.create({ data: { companyId, userId: execUserId, roleId: createdRoleId } });
    });

    const permsBefore = await permissionService.resolvePermissions(companyId, execUserId);
    expect(permsBefore.permissions).toContain(PERMISSIONS.BRANCH_VIEW);
    expect(permsBefore.permissions).not.toContain(PERMISSIONS.SETTINGS_VIEW);

    const res = await request(app.getHttpServer())
      .put(`/api/v1/roles/${createdRoleId}/permissions`)
      .set('Authorization', `Bearer ${mdToken}`)
      .send({
        permissions: [
          { permissionCode: PERMISSIONS.BRANCH_VIEW, scope: DATA_SCOPES.BRANCH },
          { permissionCode: PERMISSIONS.SETTINGS_VIEW, scope: DATA_SCOPES.ALL },
        ],
      })
      .expect(200);

    expect(res.body.data.permissions).toHaveLength(2);
    const permsAfter = await permissionService.resolvePermissions(companyId, execUserId);
    expect(permsAfter.permissions).toContain(PERMISSIONS.SETTINGS_VIEW);
  });

  it('DELETE /api/v1/roles/:id - forbids deleting system roles', async () => {
    const mdRole = await tenantDb.withCompany(companyId, async (tx) => {
      return tx.role.findFirst({ where: { companyId, code: 'MANAGING_DIRECTOR' } });
    });
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/roles/${mdRole!.id}`)
      .set('Authorization', `Bearer ${mdToken}`)
      .expect(400);
    expect(res.body.error.code).toBe('CANNOT_DELETE_SYSTEM_ROLE');
  });

  it('DELETE /api/v1/roles/:id - deletes custom role', async () => {
    await tenantDb.withCompany(companyId, async (tx) => {
      await tx.userRole.deleteMany({ where: { companyId, roleId: createdRoleId } });
    });
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/roles/${createdRoleId}`)
      .set('Authorization', `Bearer ${mdToken}`)
      .expect(200);
    expect(res.body.success).toBe(true);

    const check = await tenantDb.withCompany(companyId, async (tx) => {
      return tx.role.findUnique({ where: { id: createdRoleId, companyId } });
    });
    expect(check).toBeNull();
  });
});
