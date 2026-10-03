import { Test, TestingModule } from '@nestjs/testing';
import { ClsModule, ClsService } from 'nestjs-cls';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { RequestContext } from '../../src/common/context/request-context.service.js';
import { ConfigModule } from '../../src/config/config.module.js';
import { validateEnv } from '../../src/config/env.schema.js';
import { DatabaseModule } from '../../src/database/database.module.js';
import { PrismaService } from '../../src/database/prisma.service.js';
import { createTenantPrisma } from '../../src/database/tenant-prisma.js';

describe('S2: CLS Context & TenantPrisma Extension', () => {
  let moduleRef: TestingModule;
  let clsService: ClsService;
  let requestContext: RequestContext;
  let prismaService: PrismaService;

  const companyA = '10000000-0000-0000-0000-000000000001';
  const companyB = '10000000-0000-0000-0000-000000000002';
  const userA = 'aaaaaaaa-aaaa-7aaa-8aaa-aaaaaaaaaaaa';

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
      ],
      providers: [RequestContext],
    }).compile();

    clsService = moduleRef.get<ClsService>(ClsService);
    requestContext = moduleRef.get<RequestContext>(RequestContext);
    prismaService = moduleRef.get<PrismaService>(PrismaService);
    await prismaService.onModuleInit();

    // Clean up test table
    await prismaService.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_company_id', ${companyA}, true)`;
      await tx.$executeRawUnsafe(
        `DELETE FROM tenant_test_records WHERE company_id = '${companyA}'`,
      );
      await tx.$executeRaw`SELECT set_config('app.current_company_id', ${companyB}, true)`;
      await tx.$executeRawUnsafe(
        `DELETE FROM tenant_test_records WHERE company_id = '${companyB}'`,
      );
    });
  });

  beforeEach(async () => {
    await prismaService.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_company_id', ${companyA}, true)`;
      await tx.$executeRawUnsafe(
        `DELETE FROM tenant_test_records WHERE company_id = '${companyA}'`,
      );
      await tx.$executeRaw`SELECT set_config('app.current_company_id', ${companyB}, true)`;
      await tx.$executeRawUnsafe(
        `DELETE FROM tenant_test_records WHERE company_id = '${companyB}'`,
      );
    });
  });

  afterAll(async () => {
    if (prismaService) {
      await prismaService.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_company_id', ${companyA}, true)`;
        await tx.$executeRawUnsafe(
          `DELETE FROM tenant_test_records WHERE company_id = '${companyA}'`,
        );
        await tx.$executeRaw`SELECT set_config('app.current_company_id', ${companyB}, true)`;
        await tx.$executeRawUnsafe(
          `DELETE FROM tenant_test_records WHERE company_id = '${companyB}'`,
        );
      });
    }
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  describe('RequestContext', () => {
    it('throws or fails closed when accessing companyId outside of CLS context', () => {
      expect(() => requestContext.companyId).toThrow();
    });

    it('returns companyId, userId, branchIds from CLS context when active', async () => {
      await clsService.run(async () => {
        clsService.set('companyId', companyA);
        clsService.set('userId', userA);
        clsService.set('branchIds', ['branch-1', 'branch-2']);
        clsService.set('requestId', 'req-123');

        expect(requestContext.companyId).toBe(companyA);
        expect(requestContext.userId).toBe(userA);
        expect(requestContext.branchIds).toEqual(['branch-1', 'branch-2']);
        expect(requestContext.requestId).toBe('req-123');
      });
    });
  });

  describe('TenantPrisma extension', () => {
    it('sets app.current_company_id and enforces tenant visibility', async () => {
      // 1. Insert record for Company A using TenantPrisma bound to Company A
      const tenantPrismaA = createTenantPrisma(prismaService, companyA);

      await tenantPrismaA.$queryRawUnsafe(`
        INSERT INTO tenant_test_records (company_id, name)
        VALUES ('${companyA}', 'Company A Record')
      `);

      // 2. Querying with Company A context sees the record
      const rowsA = await tenantPrismaA.$queryRawUnsafe<Array<{ name: string }>>(`
        SELECT name FROM tenant_test_records
      `);
      expect(rowsA.length).toBe(1);
      expect(rowsA[0]?.name).toBe('Company A Record');

      // 3. Querying with Company B context returns 0 rows (fail closed)
      const tenantPrismaB = createTenantPrisma(prismaService, companyB);
      const rowsB = await tenantPrismaB.$queryRawUnsafe<Array<{ name: string }>>(`
        SELECT name FROM tenant_test_records
      `);
      expect(rowsB.length).toBe(0);

      // 4. Querying via base client without tenant setting returns 0 rows
      const rowsBase = await prismaService.$queryRawUnsafe<Array<{ name: string }>>(`
        SELECT name FROM tenant_test_records
      `);
      expect(rowsBase.length).toBe(0);
    });
  });
});
