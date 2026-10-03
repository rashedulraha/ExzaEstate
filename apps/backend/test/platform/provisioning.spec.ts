import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ClsModule } from 'nestjs-cls';
import { PrismaService } from '../../src/database/prisma.service.js';
import { TenantDb } from '../../src/database/tenant-db.service.js';
import { DatabaseModule } from '../../src/database/database.module.js';
import { ConfigModule } from '../../src/config/config.module.js';
import { validateEnv } from '../../src/config/env.schema.js';
import {
  TenantProvisioningService,
  ProvisionCompanyDto,
} from '../../src/platform/tenant-provisioning/tenant-provisioning.service.js';
import { TenantProvisioningModule } from '../../src/platform/tenant-provisioning/tenant-provisioning.module.js';
import { PERMISSIONS } from '@exzaestate/shared';

describe('S1: Tenant Provisioning Registry & provisionCompany (Tier 1)', () => {
  let moduleRef: TestingModule;
  let provisioningService: TenantProvisioningService;
  let tenantDb: TenantDb;
  let prisma: PrismaService;

  const testCompanyCode = `TPROV_${Date.now()}`;
  const localCompanyCode = `${testCompanyCode}_LOC`;
  let companyId1: string | undefined;
  let companyId2: string | undefined;

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
          middleware: { mount: false },
        }),
        DatabaseModule,
        TenantProvisioningModule,
      ],
    }).compile();

    provisioningService = moduleRef.get(TenantProvisioningService);
    tenantDb = moduleRef.get(TenantDb);
    prisma = moduleRef.get(PrismaService);
    await prisma.onModuleInit();
    provisioningService.onModuleInit();
  });

  afterAll(async () => {
    for (const id of [companyId1, companyId2]) {
      if (id) {
        try {
          await tenantDb.withCompany(id, async (tx) => {
            await (tx as unknown as PrismaService).company.delete({ where: { id } });
          });
        } catch {
          // ignore cleanup failures
        }
      }
    }
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  it('provisions company, main branch, 4 tenant roles, and cloud MD invitation in one transaction', async () => {
    const dto: ProvisionCompanyDto = {
      name: 'Prov Test Company Ltd',
      code: testCompanyCode,
      timezone: 'Asia/Dhaka',
      managingDirector: {
        email: `md-${testCompanyCode.toLowerCase()}@exzaestate.test`,
        fullName: 'Anwar Hossain',
        phone: '+8801711000000',
        isLocalMode: false,
      },
    };

    const result = await provisioningService.provisionCompany(dto);
    companyId1 = result.companyId;

    expect(result.companyId).toBeDefined();
    expect(result.branchId).toBeDefined();
    expect(result.managingDirectorUserId).toBeDefined();
    expect(result.invitationToken).toBeDefined();

    await tenantDb.withCompany(result.companyId, async (tx) => {
      const client = tx as unknown as PrismaService;

      // Verify company
      const company = await client.company.findUnique({
        where: { id: result.companyId },
        include: { branches: true },
      });
      expect(company).toBeDefined();
      expect(company!.code).toBe(testCompanyCode);
      expect(company!.branches.length).toBe(1);
      expect(company!.branches[0]!.isHeadOffice).toBe(true);

      // Verify 4 tenant roles created
      const roles = await client.role.findMany({
        where: { companyId: result.companyId },
        include: { rolePermissions: true },
      });
      expect(roles.length).toBe(4);

      const roleCodes = roles.map((r) => r.code);
      expect(roleCodes).toContain('MANAGING_DIRECTOR');
      expect(roleCodes).toContain('GENERAL_MANAGER');
      expect(roleCodes).toContain('ACCOUNTANT');
      expect(roleCodes).toContain('EXECUTIVE');

      // Verify role permissions
      const mdRole = roles.find((r) => r.code === 'MANAGING_DIRECTOR')!;
      const accountantRole = roles.find((r) => r.code === 'ACCOUNTANT')!;
      const executiveRole = roles.find((r) => r.code === 'EXECUTIVE')!;

      const mdPerms = mdRole.rolePermissions.map((rp) => rp.permissionCode);
      const accountantPerms = accountantRole.rolePermissions.map((rp) => rp.permissionCode);
      const executivePerms = executiveRole.rolePermissions.map((rp) => rp.permissionCode);

      expect(mdPerms).toContain(PERMISSIONS.USER_MANAGE);
      expect(mdPerms).toContain(PERMISSIONS.ROLE_MANAGE);
      expect(mdPerms).toContain(PERMISSIONS.JOURNAL_POST);
      expect(mdPerms).toContain(PERMISSIONS.DISCOUNT_APPROVE_TIER3);

      expect(accountantPerms).toContain(PERMISSIONS.JOURNAL_POST);
      expect(accountantPerms).toContain(PERMISSIONS.PAYMENT_POST);
      expect(accountantPerms).not.toContain(PERMISSIONS.USER_MANAGE);

      expect(executivePerms).toContain(PERMISSIONS.PAYMENT_CREATE_DRAFT);
      expect(executivePerms).not.toContain(PERMISSIONS.JOURNAL_POST);
      expect(executivePerms).not.toContain(PERMISSIONS.PAYMENT_POST);

      // Verify MD user, branch and role assignment
      const mdUser = await client.user.findUnique({
        where: { id: result.managingDirectorUserId },
        include: { roles: true, branches: true },
      });
      expect(mdUser).toBeDefined();
      expect(mdUser!.email).toBe(dto.managingDirector.email.toLowerCase());
      expect(mdUser!.roles.length).toBe(1);
      expect(mdUser!.roles[0]!.roleId).toBe(mdRole.id);
      expect(mdUser!.branches.length).toBe(1);
      expect(mdUser!.branches[0]!.branchId).toBe(result.branchId);

      // Verify invitation created in Cloud mode
      const invitation = await client.invitation.findFirst({
        where: { companyId: result.companyId, email: dto.managingDirector.email.toLowerCase() },
      });
      expect(invitation).toBeDefined();
      expect(invitation!.roleId).toBe(mdRole.id);
    });
  });

  it('provisions company with direct credentials in Local mode (first-launch wizard)', async () => {
    const dto: ProvisionCompanyDto = {
      name: 'Local Test Real Estate',
      code: localCompanyCode,
      timezone: 'Asia/Dhaka',
      managingDirector: {
        email: `md-${localCompanyCode.toLowerCase()}@exzaestate.test`,
        fullName: 'Local Managing Director',
        password: 'LocalPassword123!',
        isLocalMode: true,
      },
    };

    const result = await provisioningService.provisionCompany(dto);
    companyId2 = result.companyId;

    expect(result.companyId).toBeDefined();
    expect(result.invitationToken).toBeUndefined();

    await tenantDb.withCompany(result.companyId, async (tx) => {
      const client = tx as unknown as PrismaService;
      const user = await client.user.findUnique({
        where: { id: result.managingDirectorUserId },
      });
      expect(user).toBeDefined();
      expect(user!.status).toBe('ACTIVE');
      expect(user!.passwordHash).not.toBe('');

      // No invitation should exist in local mode
      const invitation = await client.invitation.findFirst({
        where: { companyId: result.companyId, email: dto.managingDirector.email.toLowerCase() },
      });
      expect(invitation).toBeNull();
    });
  });
});
