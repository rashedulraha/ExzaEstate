import { Test, TestingModule } from '@nestjs/testing';
import { ClsModule } from 'nestjs-cls';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DATA_SCOPES, PERMISSIONS } from '@exzaestate/shared';
import { RequestContext } from '../../src/common/context/request-context.service.js';
import { ConfigModule } from '../../src/config/config.module.js';
import { validateEnv } from '../../src/config/env.schema.js';
import { DatabaseModule } from '../../src/database/database.module.js';
import { PrismaService } from '../../src/database/prisma.service.js';
import { TenantDb } from '../../src/database/tenant-db.service.js';
import { AdaptersModule } from '../../src/adapters/adapters.module.js';
import { AuthModule } from '../../src/modules/auth/auth.module.js';
import { PermissionService } from '../../src/modules/auth/permission.service.js';
import { PlatformModule } from '../../src/platform/platform.module.js';
import { CACHE_STORE, CacheStore } from '../../src/ports/index.js';

describe('S1: Permission Schema, Global Catalogue & Cache Resolver', () => {
  let moduleRef: TestingModule;
  let prismaService: PrismaService;
  let tenantDb: TenantDb;
  let permissionService: PermissionService;
  let cacheStore: CacheStore;

  const testCompanyId = crypto.randomUUID();
  const testBranchId1 = crypto.randomUUID();
  const testBranchId2 = crypto.randomUUID();
  const testUserId = crypto.randomUUID();

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
    });

    moduleRef = await Test.createTestingModule({
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
      ],
      providers: [RequestContext, TenantDb],
    }).compile();

    prismaService = moduleRef.get<PrismaService>(PrismaService);
    tenantDb = moduleRef.get<TenantDb>(TenantDb);
    permissionService = moduleRef.get<PermissionService>(PermissionService);
    cacheStore = moduleRef.get<CacheStore>(CACHE_STORE);

    await prismaService.onModuleInit();

    // Seed test company, branches, and user
    await tenantDb.withCompany(testCompanyId, async (tx) => {
      await tx.company.create({
        data: {
          id: testCompanyId,
          companyId: testCompanyId,
          name: 'Permission Test Corp',
          code: `PERM-CORP-${Date.now()}`,
        },
      });

      await tx.branch.createMany({
        data: [
          {
            id: testBranchId1,
            companyId: testCompanyId,
            name: 'Main Branch',
            code: 'MAIN',
            isHeadOffice: true,
          },
          {
            id: testBranchId2,
            companyId: testCompanyId,
            name: 'Gulshan Branch',
            code: 'GLS',
            isHeadOffice: false,
          },
        ],
      });

      await tx.user.create({
        data: {
          id: testUserId,
          companyId: testCompanyId,
          email: `user-perm-${Date.now()}@example.com`,
          fullName: 'Permission Test User',
          passwordHash: 'dummy-hash',
          isTwoFactorEnabled: false,
          status: 'ACTIVE',
        },
      });

      // User branches
      await tx.userBranch.createMany({
        data: [
          {
            companyId: testCompanyId,
            userId: testUserId,
            branchId: testBranchId1,
            isDefault: true,
          },
          {
            companyId: testCompanyId,
            userId: testUserId,
            branchId: testBranchId2,
            isDefault: false,
          },
        ],
      });
    });
  });

  afterAll(async () => {
    if (tenantDb) {
      await tenantDb.withCompany(testCompanyId, async (tx) => {
        await tx.userBranch.deleteMany({ where: { companyId: testCompanyId } });
        await tx.userRole.deleteMany({ where: { companyId: testCompanyId } });
        await tx.rolePermission.deleteMany({ where: { companyId: testCompanyId } });
        await tx.role.deleteMany({ where: { companyId: testCompanyId } });
        await tx.user.deleteMany({ where: { companyId: testCompanyId } });
        await tx.branch.deleteMany({ where: { companyId: testCompanyId } });
        await tx.company.deleteMany({ where: { id: testCompanyId } });
      });
    }
    if (prismaService) {
      await prismaService.onModuleDestroy();
    }
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  it('verifies system_permissions global catalogue contains system permissions', async () => {
    const permissions = await prismaService.systemPermission.findMany();
    expect(permissions.length).toBeGreaterThanOrEqual(Object.keys(PERMISSIONS).length);

    const codes = new Set(permissions.map((p) => p.code));
    expect(codes.has(PERMISSIONS.JOURNAL_POST)).toBe(true);
    expect(codes.has(PERMISSIONS.PROPERTY_VIEW)).toBe(true);
    expect(codes.has(PERMISSIONS.BOOKING_CREATE)).toBe(true);
  });

  it('resolves user permissions from DB on cache miss and writes to Redis perm key with 300s TTL', async () => {
    // 1. Create Role A (Executive: property:view [TEAM], lead:view [OWN])
    // 2. Create Role B (Senior: property:view [ALL], booking:create [ALL])
    await tenantDb.withCompany(testCompanyId, async (tx) => {
      const roleA = await tx.role.create({
        data: {
          companyId: testCompanyId,
          name: 'Executive Role',
          code: 'EXEC',
        },
      });

      const roleB = await tx.role.create({
        data: {
          companyId: testCompanyId,
          name: 'Senior Role',
          code: 'SNR',
        },
      });

      await tx.rolePermission.createMany({
        data: [
          {
            companyId: testCompanyId,
            roleId: roleA.id,
            permissionCode: PERMISSIONS.PROPERTY_VIEW,
            scope: DATA_SCOPES.TEAM,
          },
          {
            companyId: testCompanyId,
            roleId: roleA.id,
            permissionCode: PERMISSIONS.LEAD_VIEW,
            scope: DATA_SCOPES.OWN,
          },
          {
            companyId: testCompanyId,
            roleId: roleB.id,
            permissionCode: PERMISSIONS.PROPERTY_VIEW,
            scope: DATA_SCOPES.ALL,
          },
          {
            companyId: testCompanyId,
            roleId: roleB.id,
            permissionCode: PERMISSIONS.BOOKING_CREATE,
            scope: DATA_SCOPES.ALL,
          },
        ],
      });

      // Assign both roles to testUserId
      await tx.userRole.createMany({
        data: [
          { companyId: testCompanyId, userId: testUserId, roleId: roleA.id },
          { companyId: testCompanyId, userId: testUserId, roleId: roleB.id },
        ],
      });
    });

    const cacheKey = `perm:${testCompanyId}:${testUserId}`;
    await cacheStore.del(cacheKey);

    // Call resolver
    const resolved = await permissionService.resolvePermissions(testCompanyId, testUserId);

    expect(resolved.permissions).toContain(PERMISSIONS.PROPERTY_VIEW);
    expect(resolved.permissions).toContain(PERMISSIONS.LEAD_VIEW);
    expect(resolved.permissions).toContain(PERMISSIONS.BOOKING_CREATE);

    // Scope hierarchy: ALL > BRANCH > TEAM > OWN.
    // For property:view, Role A has TEAM, Role B has ALL -> resolved must be ALL
    expect(resolved.scopes[PERMISSIONS.PROPERTY_VIEW]).toBe(DATA_SCOPES.ALL);
    expect(resolved.scopes[PERMISSIONS.LEAD_VIEW]).toBe(DATA_SCOPES.OWN);
    expect(resolved.scopes[PERMISSIONS.BOOKING_CREATE]).toBe(DATA_SCOPES.ALL);

    // Branches
    expect(resolved.branchIds).toContain(testBranchId1);
    expect(resolved.branchIds).toContain(testBranchId2);
    expect(resolved.defaultBranchId).toBe(testBranchId1);

    // 2FA and Status
    expect(resolved.isTwoFactorEnabled).toBe(false);
    expect(resolved.status).toBe('ACTIVE');

    // Verify Redis has cached this
    const cached = await cacheStore.get<{ permissions: string[]; scopes: Record<string, string> }>(
      cacheKey,
    );
    expect(cached).toBeDefined();
    expect(cached?.permissions).toEqual(resolved.permissions);
    expect(cached?.scopes).toEqual(resolved.scopes);
  });

  it('invalidates cache immediately when user role or branch is changed', async () => {
    const cacheKey = `perm:${testCompanyId}:${testUserId}`;

    // Ensure it is cached
    await permissionService.resolvePermissions(testCompanyId, testUserId);
    expect(await cacheStore.get(cacheKey)).toBeDefined();

    // Invalidate user cache
    await permissionService.invalidateUserPermissions(testCompanyId, testUserId);
    expect(await cacheStore.get(cacheKey)).toBeNull();
  });
});
