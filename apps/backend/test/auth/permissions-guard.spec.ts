import type { INestApplication } from '@nestjs/common';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ClsModule } from 'nestjs-cls';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DATA_SCOPES, PERMISSIONS } from '@exzaestate/shared';
import { AdaptersModule } from '../../src/adapters/adapters.module.js';
import { configureApp } from '../../src/bootstrap.js';
import { RequestContext } from '../../src/common/context/request-context.service.js';
import { Public } from '../../src/common/decorators/public.decorator.js';
import { RequirePermission } from '../../src/common/decorators/require-permission.decorator.js';
import { StepUp } from '../../src/common/decorators/step-up.decorator.js';
import { JwtAuthGuard } from '../../src/common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../src/common/guards/permissions.guard.js';
import { ConfigModule } from '../../src/config/config.module.js';
import { ConfigService } from '../../src/config/config.service.js';
import { validateEnv } from '../../src/config/env.schema.js';
import { DatabaseModule } from '../../src/database/database.module.js';
import { PrismaService } from '../../src/database/prisma.service.js';
import { TenantDb } from '../../src/database/tenant-db.service.js';
import { AuthModule } from '../../src/modules/auth/auth.module.js';
import { PermissionService } from '../../src/modules/auth/permission.service.js';
import { TokenService } from '../../src/modules/auth/token.service.js';
import { PlatformModule } from '../../src/platform/platform.module.js';

@Controller('test-rbac')
@UseGuards(JwtAuthGuard, PermissionsGuard)
class TestRbacController {
  constructor(private readonly ctx: RequestContext) {}

  @Public()
  @Get('public')
  publicEndpoint() {
    return { status: 'public-ok' };
  }

  @RequirePermission(PERMISSIONS.PROPERTY_VIEW)
  @Get('property-view')
  propertyView() {
    return {
      status: 'ok',
      scope: this.ctx.scopeFor(PERMISSIONS.PROPERTY_VIEW),
      branchIds: this.ctx.branchIds,
    };
  }

  @RequirePermission(PERMISSIONS.JOURNAL_POST)
  @Get('journal-post')
  journalPost() {
    return { status: 'posted' };
  }

  @RequirePermission(PERMISSIONS.USER_MANAGE)
  @StepUp()
  @Get('admin-step-up')
  adminStepUp() {
    return { status: 'step-up-verified' };
  }
}

describe('S2: PermissionsGuard, Scope Resolution & Mandatory 2FA Check', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let prismaService: PrismaService;
  let tenantDb: TenantDb;
  let tokenService: TokenService;
  let permissionService: PermissionService;

  const companyId = crypto.randomUUID();
  const branchId = crypto.randomUUID();
  const execId = crypto.randomUUID();
  const execSid = crypto.randomUUID();
  const accId = crypto.randomUUID();
  const accSid = crypto.randomUUID();
  const adminId = crypto.randomUUID();
  const adminSid = crypto.randomUUID();

  let execToken = '';
  let accToken = '';
  let adminToken = '';

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

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot(config),
        ClsModule.forRoot({ global: true, middleware: { mount: true } }),
        DatabaseModule,
        AdaptersModule.forRoot('cloud'),
        PlatformModule,
        AuthModule,
      ],
      controllers: [TestRbacController],
      providers: [RequestContext, TenantDb, PermissionsGuard],
    }).compile();

    prismaService = moduleRef.get<PrismaService>(PrismaService);
    tenantDb = moduleRef.get<TenantDb>(TenantDb);
    tokenService = moduleRef.get<TokenService>(TokenService);
    permissionService = moduleRef.get<PermissionService>(PermissionService);
    const configService = moduleRef.get<ConfigService>(ConfigService);

    app = moduleRef.createNestApplication();
    configureApp(app, configService);
    await app.init();
    await prismaService.onModuleInit();

    await tenantDb.withCompany(companyId, async (tx) => {
      await tx.company.create({
        data: { id: companyId, companyId, name: 'Corp', code: `C-${Date.now()}` },
      });
      await tx.branch.create({
        data: { id: branchId, companyId, name: 'HQ', code: 'HQ', isHeadOffice: true },
      });

      // Exec (no 2FA, property:view [BRANCH])
      await tx.user.create({
        data: {
          id: execId,
          companyId,
          email: `e-${Date.now()}@t.com`,
          fullName: 'E',
          passwordHash: 'x',
        },
      });
      await tx.session.create({
        data: { id: execSid, companyId, userId: execId, familyId: crypto.randomUUID() },
      });
      await tx.userBranch.create({
        data: { companyId, userId: execId, branchId, isDefault: true },
      });
      const rExec = await tx.role.create({ data: { companyId, name: 'Exec', code: 'EXEC' } });
      await tx.rolePermission.create({
        data: {
          companyId,
          roleId: rExec.id,
          permissionCode: PERMISSIONS.PROPERTY_VIEW,
          scope: DATA_SCOPES.BRANCH,
        },
      });
      await tx.userRole.create({ data: { companyId, userId: execId, roleId: rExec.id } });

      // Accountant (no 2FA, holds mandatory 2FA journal:post)
      await tx.user.create({
        data: {
          id: accId,
          companyId,
          email: `a-${Date.now()}@t.com`,
          fullName: 'A',
          passwordHash: 'x',
        },
      });
      await tx.session.create({
        data: { id: accSid, companyId, userId: accId, familyId: crypto.randomUUID() },
      });
      const rAcc = await tx.role.create({ data: { companyId, name: 'Acc', code: 'ACC' } });
      await tx.rolePermission.create({
        data: {
          companyId,
          roleId: rAcc.id,
          permissionCode: PERMISSIONS.JOURNAL_POST,
          scope: DATA_SCOPES.ALL,
        },
      });
      await tx.userRole.create({ data: { companyId, userId: accId, roleId: rAcc.id } });

      // Admin (2FA enabled, user:manage with step-up)
      await tx.user.create({
        data: {
          id: adminId,
          companyId,
          email: `m-${Date.now()}@t.com`,
          fullName: 'M',
          passwordHash: 'x',
          isTwoFactorEnabled: true,
        },
      });
      await tx.session.create({
        data: { id: adminSid, companyId, userId: adminId, familyId: crypto.randomUUID() },
      });
      const rAdm = await tx.role.create({ data: { companyId, name: 'Adm', code: 'ADM' } });
      await tx.rolePermission.create({
        data: {
          companyId,
          roleId: rAdm.id,
          permissionCode: PERMISSIONS.USER_MANAGE,
          scope: DATA_SCOPES.ALL,
        },
      });
      await tx.userRole.create({ data: { companyId, userId: adminId, roleId: rAdm.id } });
    });

    execToken = tokenService.generateAccessToken({ sub: execId, companyId, sid: execSid });
    accToken = tokenService.generateAccessToken({ sub: accId, companyId, sid: accSid });
    adminToken = tokenService.generateAccessToken({ sub: adminId, companyId, sid: adminSid });
  });

  afterAll(async () => {
    if (tenantDb) {
      await tenantDb.withCompany(companyId, async (tx) => {
        await tx.userBranch.deleteMany({ where: { companyId } });
        await tx.userRole.deleteMany({ where: { companyId } });
        await tx.rolePermission.deleteMany({ where: { companyId } });
        await tx.role.deleteMany({ where: { companyId } });
        await tx.session.deleteMany({ where: { companyId } });
        await tx.user.deleteMany({ where: { companyId } });
        await tx.branch.deleteMany({ where: { companyId } });
        await tx.company.deleteMany({ where: { id: companyId } });
      });
    }
    if (app) await app.close();
  });

  it('allows access to @Public() endpoint without token', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/test-rbac/public');
    expect(res.status).toBe(200);
  });

  it('allows executive to access property-view with resolved BRANCH scope', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/test-rbac/property-view')
      .set('Authorization', `Bearer ${execToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.scope).toBe(DATA_SCOPES.BRANCH);
  });

  it('denies executive from accessing journal-post with 403 FORBIDDEN', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/test-rbac/journal-post')
      .set('Authorization', `Bearer ${execToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('enforces mandatory 2FA: accountant without 2FA gets 403 TWO_FACTOR_REQUIRED', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/test-rbac/journal-post')
      .set('Authorization', `Bearer ${accToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('TWO_FACTOR_REQUIRED');
  });

  it('enforces @StepUp(): admin without step-up gets 403 STEP_UP_REQUIRED', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/test-rbac/admin-step-up')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('STEP_UP_REQUIRED');
  });

  it('allows access to @StepUp() when session has valid stepUpUntil', async () => {
    await tenantDb.withCompany(companyId, async (tx) => {
      await tx.session.update({
        where: { id: adminSid },
        data: { stepUpUntil: new Date(Date.now() + 300000) },
      });
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/test-rbac/admin-step-up')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it('changing a user role or scope takes effect on the very next request', async () => {
    await tenantDb.withCompany(companyId, async (tx) => {
      const role = await tx.role.findFirstOrThrow({ where: { companyId, code: 'EXEC' } });
      await tx.rolePermission.updateMany({
        where: { companyId, roleId: role.id, permissionCode: PERMISSIONS.PROPERTY_VIEW },
        data: { scope: DATA_SCOPES.ALL },
      });
      await permissionService.invalidateRolePermissions(companyId, role.id);
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/test-rbac/property-view')
      .set('Authorization', `Bearer ${execToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.scope).toBe(DATA_SCOPES.ALL);
  });
});
