import { HttpStatus } from '@nestjs/common';
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
import { PermissionService } from '../../src/modules/auth/permission.service.js';
import { TokenService } from '../../src/modules/auth/token.service.js';
import { EmployeeModule } from '../../src/modules/employee/employee.module.js';
import { PlatformModule } from '../../src/platform/platform.module.js';
import { TenantProvisioningModule } from '../../src/platform/tenant-provisioning/tenant-provisioning.module.js';
import { TenantProvisioningService } from '../../src/platform/tenant-provisioning/tenant-provisioning.service.js';

describe('Employee Hierarchy & TEAM Scope Resolution (Step S4)', () => {
  let app: INestApplication;
  let tenantDb: TenantDb;
  let tokenService: TokenService;
  let permissionService: PermissionService;
  let provisioningService: TenantProvisioningService;

  let companyId: string;
  let headOfficeBranchId: string;
  let mdUserId: string;
  let mdToken: string;

  let gmUserId: string;
  let gmEmployeeId: string;

  let exec1UserId: string;
  let exec1EmployeeId: string;

  let exec2UserId: string;
  let exec2EmployeeId: string;

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
        EmployeeModule,
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
      name: 'Hierarchy Test Estate Ltd',
      code: `HIE${Date.now().toString().slice(-4)}`,
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
    headOfficeBranchId = prov.branchId;

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

    // Create GM User & Exec Users
    const gmUser = await tenantDb.withCompany(companyId, async (tx) => {
      return tx.user.create({
        data: {
          companyId,
          email: `gm_${Date.now()}@exzaestate.test`,
          fullName: 'GM Rafiq',
          passwordHash: 'dummy',
          status: 'ACTIVE',
        },
      });
    });
    gmUserId = gmUser.id;

    const exec1User = await tenantDb.withCompany(companyId, async (tx) => {
      return tx.user.create({
        data: {
          companyId,
          email: `exec1_${Date.now()}@exzaestate.test`,
          fullName: 'Exec Tanveer',
          passwordHash: 'dummy',
          status: 'ACTIVE',
        },
      });
    });
    exec1UserId = exec1User.id;

    const exec2User = await tenantDb.withCompany(companyId, async (tx) => {
      return tx.user.create({
        data: {
          companyId,
          email: `exec2_${Date.now()}@exzaestate.test`,
          fullName: 'Exec Nusrat',
          passwordHash: 'dummy',
          status: 'ACTIVE',
        },
      });
    });
    exec2UserId = exec2User.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/v1/employees - creates employee profile for GM', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${mdToken}`)
      .send({
        userId: gmUserId,
        employeeCode: 'EMP-GM-001',
        designation: 'General Manager',
        branchId: headOfficeBranchId,
      })
      .expect(HttpStatus.CREATED);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.employeeCode).toBe('EMP-GM-001');
    gmEmployeeId = res.body.data.id;
  });

  it('POST /api/v1/employees - creates employee profiles for Executives with GM as supervisor', async () => {
    const res1 = await request(app.getHttpServer())
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${mdToken}`)
      .send({
        userId: exec1UserId,
        employeeCode: 'EMP-EX-001',
        designation: 'Sales Executive 1',
        branchId: headOfficeBranchId,
        supervisorId: gmEmployeeId,
      })
      .expect(HttpStatus.CREATED);

    expect(res1.body.success).toBe(true);
    exec1EmployeeId = res1.body.data.id;

    const res2 = await request(app.getHttpServer())
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${mdToken}`)
      .send({
        userId: exec2UserId,
        employeeCode: 'EMP-EX-002',
        designation: 'Sales Executive 2',
        branchId: headOfficeBranchId,
        supervisorId: gmEmployeeId,
      })
      .expect(HttpStatus.CREATED);

    expect(res2.body.success).toBe(true);
    exec2EmployeeId = res2.body.data.id;
  });

  it('resolves teamUserIds for TEAM scope: GM subtree contains GM, Exec1, and Exec2', async () => {
    const gmPerms = await permissionService.resolvePermissions(companyId, gmUserId);
    expect(gmPerms.teamUserIds).toContain(gmUserId);
    expect(gmPerms.teamUserIds).toContain(exec1UserId);
    expect(gmPerms.teamUserIds).toContain(exec2UserId);
    expect(gmPerms.teamUserIds).toHaveLength(3);

    const exec1Perms = await permissionService.resolvePermissions(companyId, exec1UserId);
    expect(exec1Perms.teamUserIds).toEqual([exec1UserId]);
  });

  it('PATCH /api/v1/employees/:id - updates supervisor and invalidates permission cache', async () => {
    // Reassign Exec2 to report to Exec1
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/employees/${exec2EmployeeId}`)
      .set('Authorization', `Bearer ${mdToken}`)
      .send({ supervisorId: exec1EmployeeId })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.supervisorId).toBe(exec1EmployeeId);

    // Now Exec1's teamUserIds must contain Exec1 and Exec2!
    const exec1PermsAfter = await permissionService.resolvePermissions(companyId, exec1UserId);
    expect(exec1PermsAfter.teamUserIds).toContain(exec1UserId);
    expect(exec1PermsAfter.teamUserIds).toContain(exec2UserId);
    expect(exec1PermsAfter.teamUserIds).toHaveLength(2);

    // GM's subtree still contains GM, Exec1, and Exec2 (via multi-level hierarchy!)
    const gmPermsAfter = await permissionService.resolvePermissions(companyId, gmUserId);
    expect(gmPermsAfter.teamUserIds).toContain(gmUserId);
    expect(gmPermsAfter.teamUserIds).toContain(exec1UserId);
    expect(gmPermsAfter.teamUserIds).toContain(exec2UserId);
    expect(gmPermsAfter.teamUserIds).toHaveLength(3);
  });

  it('GET /api/v1/employees - lists company employees', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/employees')
      .set('Authorization', `Bearer ${mdToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(3);
  });

  it('PATCH /api/v1/employees/:id - rejects circular supervisor hierarchy', async () => {
    // Attempt to make GM report to Exec2 (which creates a cycle GM -> Exec1 -> Exec2 -> GM)
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/employees/${gmEmployeeId}`)
      .set('Authorization', `Bearer ${mdToken}`)
      .send({ supervisorId: exec2EmployeeId })
      .expect(HttpStatus.BAD_REQUEST);

    expect(res.body.error.code).toBe('CIRCULAR_SUPERVISOR_HIERARCHY');
  });
});
