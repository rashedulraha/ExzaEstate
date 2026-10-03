import { HttpStatus } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ClsModule } from 'nestjs-cls';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ERROR_CODES } from '@exzaestate/shared';
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

describe('Admin 2FA Reset (Step S3)', () => {
  let app: INestApplication;
  let tenantDb: TenantDb;
  let tokenService: TokenService;
  let permissionService: PermissionService;
  let provisioningService: TenantProvisioningService;
  let companyId: string;
  let mdUserId: string;
  let mdToken: string;
  let noStepUpToken: string;
  let execToken: string;
  let staffUserId: string;
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
      name: '2FA Reset Test Co',
      code: `RST${Date.now().toString().slice(-4)}`,
      branchName: 'Head Office',
      branchCode: 'HO-01',
      managingDirector: {
        email: `admin_${Date.now()}@exzaestate.test`,
        fullName: 'Admin MD',
        password: 'Password123!Secure',
        isLocalMode: true,
      },
    });

    companyId = prov.companyId;
    mdUserId = prov.managingDirectorUserId;

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

    // Create staff user with 2FA enrolled
    const staff = await tenantDb.withCompany(companyId, async (tx) => {
      const u = await tx.user.create({
        data: {
          companyId,
          email: `staff_${Date.now()}@exzaestate.test`,
          fullName: 'Staff User With 2FA',
          passwordHash: 'dummy',
          status: 'ACTIVE',
          isTwoFactorEnabled: true,
          twoFactorSecret: 'ENCRYPTED_SECRET',
          twoFactorRecoveryCodes: ['HASHED_CODE_1', 'HASHED_CODE_2'],
          twoFactorEnrolledAt: new Date(),
        },
      });

      const execRole = await tx.role.findFirstOrThrow({ where: { companyId, code: 'EXECUTIVE' } });
      await tx.userRole.create({ data: { companyId, userId: u.id, roleId: execRole.id } });
      return u;
    });
    staffUserId = staff.id;

    const staffSession = await tenantDb.withCompany(companyId, async (tx) => {
      return tx.session.create({
        data: { companyId, userId: staffUserId, familyId: crypto.randomUUID() },
      });
    });
    staffToken = tokenService.generateAccessToken({
      sub: staffUserId,
      companyId,
      sid: staffSession.id,
    });

    // Executive session (no user:manage)
    execToken = staffToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/v1/users/:id/reset-2fa - denies without user:manage permission', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/users/${staffUserId}/reset-2fa`)
      .set('Authorization', `Bearer ${execToken}`)
      .expect(HttpStatus.FORBIDDEN);

    expect(res.body.error.code).toBe(ERROR_CODES.FORBIDDEN);
  });

  it('POST /api/v1/users/:id/reset-2fa - denies without Step-Up authentication', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/users/${staffUserId}/reset-2fa`)
      .set('Authorization', `Bearer ${noStepUpToken}`)
      .expect(HttpStatus.FORBIDDEN);

    expect(res.body.error.code).toBe(ERROR_CODES.STEP_UP_REQUIRED);
  });

  it('POST /api/v1/users/:id/reset-2fa - resets 2FA, revokes sessions, logs audit & security event', async () => {
    // Verify 2FA is active before reset
    const permsBefore = await permissionService.resolvePermissions(companyId, staffUserId);
    expect(permsBefore.isTwoFactorEnabled).toBe(true);

    const res = await request(app.getHttpServer())
      .post(`/api/v1/users/${staffUserId}/reset-2fa`)
      .set('Authorization', `Bearer ${mdToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);

    // 1. Database state check: 2FA fields cleared
    const userInDb = await tenantDb.withCompany(companyId, async (tx) => {
      return tx.user.findUniqueOrThrow({ where: { id: staffUserId, companyId } });
    });
    expect(userInDb.isTwoFactorEnabled).toBe(false);
    expect(userInDb.twoFactorSecret).toBeNull();
    expect(userInDb.twoFactorRecoveryCodes).toHaveLength(0);
    expect(userInDb.twoFactorEnrolledAt).toBeNull();

    // 2. Permission cache invalidated: reflects isTwoFactorEnabled = false
    const permsAfter = await permissionService.resolvePermissions(companyId, staffUserId);
    expect(permsAfter.isTwoFactorEnabled).toBe(false);

    // 3. Active sessions revoked: old staff token fails with 401
    const checkSessionRes = await request(app.getHttpServer())
      .get('/api/v1/roles')
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(401);
    expect(checkSessionRes.body.error.code).toBe(ERROR_CODES.UNAUTHORIZED);

    // 4. Audit log entry recorded
    const auditEntry = await tenantDb.withCompany(companyId, async (tx) => {
      return tx.auditLog.findFirst({
        where: { companyId, recordId: staffUserId, action: 'user.2fa_reset_by_admin' },
      });
    });
    expect(auditEntry).not.toBeNull();
    expect(auditEntry?.action).toBe('user.2fa_reset_by_admin');

    // 5. Security event recorded
    const secEvent = await tenantDb.withCompany(companyId, async (tx) => {
      return tx.securityEvent.findFirst({
        where: { companyId, userId: staffUserId, eventType: 'TWO_FACTOR_RESET' },
      });
    });
    expect(secEvent).not.toBeNull();
    expect(secEvent?.eventType).toBe('TWO_FACTOR_RESET');
  });
});
