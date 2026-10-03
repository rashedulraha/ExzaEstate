import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ClsModule } from 'nestjs-cls';
import { PrismaService } from '../../src/database/prisma.service.js';
import { TenantDb } from '../../src/database/tenant-db.service.js';
import { DatabaseModule } from '../../src/database/database.module.js';
import { ConfigModule } from '../../src/config/config.module.js';
import { validateEnv } from '../../src/config/env.schema.js';
import { DemoSeedService } from '../../src/platform/tenant-provisioning/demo-seed/demo-seed.service.js';
import { TenantProvisioningModule } from '../../src/platform/tenant-provisioning/tenant-provisioning.module.js';
import { buildCompanyDto } from '../factories/company.factory.js';

describe('S3: Demo Seed Registry & Bangla Fixtures', () => {
  let moduleRef: TestingModule;
  let demoSeedService: DemoSeedService;
  let tenantDb: TenantDb;
  let prisma: PrismaService;
  let createdCompanyId: string | undefined;

  const testCompanyCode = `DEMO_${Date.now()}`;

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

    demoSeedService = moduleRef.get(DemoSeedService);
    tenantDb = moduleRef.get(TenantDb);
    prisma = moduleRef.get(PrismaService);
    await prisma.onModuleInit();
    demoSeedService.onModuleInit();
  });

  afterAll(async () => {
    if (createdCompanyId) {
      try {
        await tenantDb.withCompany(createdCompanyId, async (tx) => {
          await (tx as unknown as PrismaService).company.delete({
            where: { id: createdCompanyId },
          });
        });
      } catch {
        // ignore cleanup error
      }
    }
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  it('runs demo seed with Bangla company fixtures and creates 4 core role staff users', async () => {
    const dto = buildCompanyDto({
      code: testCompanyCode,
      name: 'রূপায়ণ রিয়েল এস্টেট লি. (Rupayan Real Estate)',
      branchName: 'প্রধান কার্যালয় (গুলশান)',
      managingDirector: {
        email: `md-${testCompanyCode.toLowerCase()}@exzaestate.test`,
        fullName: 'আনোয়ার হোসেন (Anwar Hossain)',
        password: 'ExzaEstate@2026!',
        isLocalMode: true,
      },
    });

    const result = await demoSeedService.runDemoSeed(dto);
    createdCompanyId = result.companyId;

    expect(result.companyId).toBeDefined();
    expect(result.companyCode).toBe(testCompanyCode);

    await tenantDb.withCompany(result.companyId, async (tx) => {
      const client = tx as unknown as PrismaService;

      // Verify company created with Bangla name
      const company = await client.company.findUnique({
        where: { id: result.companyId },
        include: { branches: true },
      });
      expect(company).toBeDefined();
      expect(company!.name).toContain('রূপায়ণ');
      expect(company!.branches.length).toBe(1);
      expect(company!.branches[0]!.name).toContain('প্রধান কার্যালয়');

      // Verify roles exist
      const roles = await client.role.findMany({
        where: { companyId: result.companyId },
      });
      expect(roles.length).toBe(4);

      // Verify MD user exists
      const mdUser = await client.user.findUnique({
        where: { email: dto.managingDirector.email },
        include: { roles: true },
      });
      expect(mdUser).toBeDefined();
      expect(mdUser!.fullName).toContain('আনোয়ার হোসেন');
      expect(mdUser!.status).toBe('ACTIVE');
    });
  });
});
