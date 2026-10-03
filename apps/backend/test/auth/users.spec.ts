import type { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ClsModule } from 'nestjs-cls';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ERROR_CODES, PERMISSIONS } from '@exzaestate/shared';
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

describe('User Management (Step S2)', () => {
  let app: INestApplication;
  let tenantDb: TenantDb;
  let tokenService: TokenService;
  let permissionService: PermissionService;
  let provisioningService: TenantProvisioningService;
  let companyId: string;
  let headOfficeBranchId: string;
  let mdUserId: string;
  let mdToken: string;
  let noStepUpToken: string;
  let accountantRoleId: string;
  let executiveRoleId: string;
  let createdUserId: string;

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

    const prov = await provisioningService.provisionCompany({
      name: 'User Test Ltd',
      code: `USR${Date.now().toString().slice(-4)}`,
      branchName: 'Head Office',
      branchCode: 'HO-01',
      managingDirector: {
        email: `admin_${Date.now()}@exzaestate.test`,
        fullName: 'User Admin MD',
        password: 'Password123!Secure',
        isLocalMode: true,
      },
    });

    companyId = prov.companyId;
    mdUserId = prov.managingDirectorUserId;
    headOfficeBranchId = prov.branchId;

    await tenantDb.withCompany(companyId, async (tx) => {
      await tx.user.update({
        where: { id: mdUserId, companyId },
        data: { isTwoFactorEnabled: true, twoFactorEnrolledAt: new Date() },
      });
      const accRole = await tx.role.findFirstOrThrow({ where: { companyId, code: 'ACCOUNTANT' } });
      accountantRoleId = accRole.id;
      const execRole = await tx.role.findFirstOrThrow({ where: { companyId, code: 'EXECUTIVE' } });
      executiveRoleId = execRole.id;
    });

    const stepUpUntil = new Date(Date.now() + 5 * 60 * 1000);
    const mdSession = await tenantDb.withCompany(companyId, async (tx) => {
      return tx.session.create({
        data: { companyId, userId: mdUserId, familyId: crypto.randomUUID(), stepUpUntil },
      });
    });
    mdToken = tokenService.generateAccessToken({ sub: mdUserId, companyId, sid: mdSession.id });

    const noStepUpSession = await tenantDb.withCompany(companyId, async (tx) => {
      return tx.session.create({
        data: { companyId, userId: mdUserId, familyId: crypto.randomUUID(), stepUpUntil: null },
      });
    });
    noStepUpToken = tokenService.generateAccessToken({
      sub: mdUserId,
      companyId,
      sid: noStepUpSession.id,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/users - lists company users for user with user:view', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${mdToken}`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.items[0].email).toBeDefined();
  });

  it('POST /api/v1/users/invite - invites new user with step-up', async () => {
    const inviteEmail = `invited_${Date.now()}@exzaestate.test`;
    const res = await request(app.getHttpServer())
      .post('/api/v1/users/invite')
      .set('Authorization', `Bearer ${mdToken}`)
      .send({ email: inviteEmail, roleId: accountantRoleId, branchIds: [headOfficeBranchId] })
      .expect(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(inviteEmail);
  });

  it('POST /api/v1/users - rejects direct creation without step-up', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${noStepUpToken}`)
      .send({
        email: `local_${Date.now()}@exzaestate.test`,
        fullName: 'Local Mode User',
        roleIds: [executiveRoleId],
        temporaryPassword: 'TempPassword123!Secure',
      })
      .expect(403);
    expect(res.body.error.code).toBe(ERROR_CODES.STEP_UP_REQUIRED);
  });

  it('POST /api/v1/users - creates user with temp password and forced change', async () => {
    const email = `local_${Date.now()}@exzaestate.test`;
    const res = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${mdToken}`)
      .send({
        email,
        fullName: 'Local Mode Staff',
        phone: '+8801712345678',
        roleIds: [executiveRoleId],
        branchIds: [headOfficeBranchId],
        defaultBranchId: headOfficeBranchId,
        temporaryPassword: 'TempPassword123!Secure',
        mustChangePassword: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.mustChangePassword).toBe(true);
    expect(res.body.data.roles).toHaveLength(1);
    createdUserId = res.body.data.id;
  });

  it('PUT /api/v1/users/:id/roles - updates user roles and invalidates permission cache', async () => {
    const permsBefore = await permissionService.resolvePermissions(companyId, createdUserId);
    expect(permsBefore.permissions).not.toContain(PERMISSIONS.PAYMENT_POST);

    const res = await request(app.getHttpServer())
      .put(`/api/v1/users/${createdUserId}/roles`)
      .set('Authorization', `Bearer ${mdToken}`)
      .send({ roleIds: [accountantRoleId] })
      .expect(200);

    expect(res.body.success).toBe(true);
    const permsAfter = await permissionService.resolvePermissions(companyId, createdUserId);
    expect(permsAfter.permissions).toContain(PERMISSIONS.PAYMENT_POST);
  });

  it('PUT /api/v1/users/:id/branches - updates user branch assignments', async () => {
    const res = await request(app.getHttpServer())
      .put(`/api/v1/users/${createdUserId}/branches`)
      .set('Authorization', `Bearer ${mdToken}`)
      .send({ branches: [{ branchId: headOfficeBranchId, isDefault: true }] })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.branches).toHaveLength(1);
  });

  it('POST /api/v1/users/:id/reset-password - admin resets user password with temporary password', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/users/${createdUserId}/reset-password`)
      .set('Authorization', `Bearer ${mdToken}`)
      .send({ temporaryPassword: 'NewTempPassword123!Secure' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.mustChangePassword).toBe(true);
  });

  it('POST /api/v1/users/:id/deactivate - deactivates user and immediately revokes active sessions', async () => {
    const userSession = await tenantDb.withCompany(companyId, async (tx) => {
      return tx.session.create({
        data: { companyId, userId: createdUserId, familyId: crypto.randomUUID() },
      });
    });
    const userToken = tokenService.generateAccessToken({
      sub: createdUserId,
      companyId,
      sid: userSession.id,
    });

    // User can access endpoints while active (or permission check resolves status ACTIVE)
    const permsActive = await permissionService.resolvePermissions(companyId, createdUserId);
    expect(permsActive.status).toBe('ACTIVE');

    // Deactivate user
    const res = await request(app.getHttpServer())
      .post(`/api/v1/users/${createdUserId}/deactivate`)
      .set('Authorization', `Bearer ${mdToken}`)
      .expect(200);
    expect(res.body.success).toBe(true);

    // Permission cache immediately reflects INACTIVE
    const permsInactive = await permissionService.resolvePermissions(companyId, createdUserId);
    expect(permsInactive.status).toBe('INACTIVE');

    // Calling any authenticated route with userToken gets 401 Unauthorized (revoked session)
    const checkRes = await request(app.getHttpServer())
      .get('/api/v1/roles')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(401);
    expect(checkRes.body.error.code).toBe(ERROR_CODES.UNAUTHORIZED);
  });
});
