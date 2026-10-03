import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ClsModule } from 'nestjs-cls';
import argon2 from 'argon2';
import { PrismaService } from '../../src/database/prisma.service.js';
import { SystemPrisma } from '../../src/database/system-prisma.service.js';
import { TenantDb } from '../../src/database/tenant-db.service.js';
import { DatabaseModule } from '../../src/database/database.module.js';
import { ConfigModule } from '../../src/config/config.module.js';
import { validateEnv } from '../../src/config/env.schema.js';
import {
  TenantProvisioningService,
  ProvisionCompanyDto,
  ProvisioningStep,
  ProvisioningContext,
} from '../../src/platform/tenant-provisioning/tenant-provisioning.service.js';
import { TenantProvisioningModule } from '../../src/platform/tenant-provisioning/tenant-provisioning.module.js';

describe('S4: Provisioning Idempotency & Rollback Tests (Tier 1)', () => {
  let moduleRef: TestingModule;
  let provisioningService: TenantProvisioningService;
  let tenantDb: TenantDb;
  let prisma: PrismaService;
  let systemPrisma: SystemPrisma;

  const idempotentCompanyCode = `IDEMP_${Date.now()}`;
  const rollbackCompanyCode = `ROLLBACK_${Date.now()}`;
  let cleanCompanyId: string | undefined;

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
    systemPrisma = moduleRef.get(SystemPrisma);

    await prisma.onModuleInit();
    await systemPrisma.onModuleInit();
    provisioningService.onModuleInit();
  });

  afterAll(async () => {
    if (cleanCompanyId) {
      try {
        await tenantDb.withCompany(cleanCompanyId, async (tx) => {
          await (tx as unknown as PrismaService).company.delete({ where: { id: cleanCompanyId } });
        });
      } catch {
        // ignore cleanup error
      }
    }
    if (systemPrisma) {
      await systemPrisma.onModuleDestroy();
    }
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  it('provisioning the same company twice produces no duplicate records (Idempotency)', async () => {
    const dto: ProvisionCompanyDto = {
      name: 'Idempotency Test Properties Ltd.',
      code: idempotentCompanyCode,
      timezone: 'Asia/Dhaka',
      branchName: 'Head Office',
      branchCode: 'HO',
      managingDirector: {
        email: `md-${idempotentCompanyCode.toLowerCase()}@exzaestate.test`,
        fullName: 'Anwar Hossain',
        phone: '+8801711223344',
        password: 'ExzaEstate@2026!',
        isLocalMode: true,
      },
    };

    // First provisioning run
    const firstResult = await provisioningService.provisionCompany(dto);
    cleanCompanyId = firstResult.companyId;

    let branchCount1 = 0;
    let roleCount1 = 0;
    let permCount1 = 0;
    let userCount1 = 0;

    await tenantDb.withCompany(firstResult.companyId, async (tx) => {
      const client = tx as unknown as PrismaService;
      branchCount1 = await client.branch.count({ where: { companyId: firstResult.companyId } });
      roleCount1 = await client.role.count({ where: { companyId: firstResult.companyId } });
      permCount1 = await client.rolePermission.count({
        where: { companyId: firstResult.companyId },
      });
      userCount1 = await client.user.count({ where: { companyId: firstResult.companyId } });
    });

    expect(branchCount1).toBe(1);
    expect(roleCount1).toBe(4);
    expect(permCount1).toBeGreaterThan(0);
    expect(userCount1).toBe(1);

    // Second provisioning run with same company code
    const secondResult = await provisioningService.provisionCompany(dto);
    expect(secondResult.companyId).toBe(firstResult.companyId);

    // Verify ZERO duplicate rows created
    await tenantDb.withCompany(firstResult.companyId, async (tx) => {
      const client = tx as unknown as PrismaService;
      const companyCount = await client.company.count({ where: { id: firstResult.companyId } });
      const branchCount2 = await client.branch.count({
        where: { companyId: firstResult.companyId },
      });
      const roleCount2 = await client.role.count({ where: { companyId: firstResult.companyId } });
      const permCount2 = await client.rolePermission.count({
        where: { companyId: firstResult.companyId },
      });
      const userCount2 = await client.user.count({ where: { companyId: firstResult.companyId } });

      expect(companyCount).toBe(1);
      expect(branchCount2).toBe(branchCount1);
      expect(roleCount2).toBe(roleCount1);
      expect(permCount2).toBe(permCount1);
      expect(userCount2).toBe(userCount1);
    });
  });

  it('deliberately failing step rolls back the whole transaction (Atomic Rollback - no partial company)', async () => {
    // Register a deliberately failing step at order 25 (between roles and MD)
    class FailingStep implements ProvisioningStep {
      readonly name = 'FailingStep';
      readonly order = 25;
      async execute(_ctx: ProvisioningContext): Promise<void> {
        throw new Error('Simulated failure during provisioning pipeline');
      }
    }

    provisioningService.registerStep(new FailingStep());

    const dto: ProvisionCompanyDto = {
      name: 'Rollback Test Company',
      code: rollbackCompanyCode,
      managingDirector: {
        email: `md-${rollbackCompanyCode.toLowerCase()}@exzaestate.test`,
        fullName: 'Rollback MD',
        password: 'ExzaEstate@2026!',
        isLocalMode: true,
      },
    };

    // Provisioning must throw the simulated error
    await expect(provisioningService.provisionCompany(dto)).rejects.toThrow(
      'Simulated failure during provisioning pipeline',
    );

    // Verify company does NOT exist in DB (complete rollback)
    const company = await systemPrisma.executeWithReason(
      '// SYSTEM-SCOPE: Verify rollback of company on failed provisioning step',
      async (client) => {
        return client.company.findUnique({ where: { code: rollbackCompanyCode } });
      },
    );

    expect(company).toBeNull();
  });

  it('authenticates the seeded MD credentials with Argon2id', async () => {
    expect(cleanCompanyId).toBeDefined();

    await tenantDb.withCompany(cleanCompanyId!, async (tx) => {
      const client = tx as unknown as PrismaService;
      const user = await client.user.findFirst({
        where: { companyId: cleanCompanyId! },
      });

      expect(user).toBeDefined();
      expect(user!.status).toBe('ACTIVE');

      const isValidPassword = await argon2.verify(user!.passwordHash, 'ExzaEstate@2026!');
      expect(isValidPassword).toBe(true);

      const isBadPassword = await argon2.verify(user!.passwordHash, 'WrongPassword123!');
      expect(isBadPassword).toBe(false);
    });
  });
});
