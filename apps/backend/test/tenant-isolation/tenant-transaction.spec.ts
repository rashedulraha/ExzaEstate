import { Test, TestingModule } from '@nestjs/testing';
import { ClsModule, ClsService } from 'nestjs-cls';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { RequestContext } from '../../src/common/context/request-context.service.js';
import { ConfigModule } from '../../src/config/config.module.js';
import { validateEnv } from '../../src/config/env.schema.js';
import { DatabaseModule } from '../../src/database/database.module.js';
import { PrismaService } from '../../src/database/prisma.service.js';
import { TenantDb } from '../../src/database/tenant-db.service.js';

describe('S3: tenantDb.transaction wrapper', () => {
  let moduleRef: TestingModule;
  let clsService: ClsService;
  let tenantDb: TenantDb;
  let prismaService: PrismaService;

  const companyA = '20000000-0000-0000-0000-000000000001';
  const companyB = '20000000-0000-0000-0000-000000000002';

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
      providers: [RequestContext, TenantDb],
    }).compile();

    clsService = moduleRef.get<ClsService>(ClsService);
    tenantDb = moduleRef.get<TenantDb>(TenantDb);
    prismaService = moduleRef.get<PrismaService>(PrismaService);
    await prismaService.onModuleInit();

    // Clean up
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
      await prismaService.$executeRawUnsafe(
        `DELETE FROM tenant_test_records WHERE company_id IN ('${companyA}', '${companyB}')`,
      );
    }
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  it('sets transaction-local app.current_company_id and writes data successfully', async () => {
    await clsService.run(async () => {
      clsService.set('companyId', companyA);

      await tenantDb.transaction(async (tx) => {
        // Assert current_setting matches companyA
        const setting = await tx.$queryRawUnsafe<Array<{ setting: string }>>(
          `SELECT current_setting('app.current_company_id') as setting`,
        );
        expect(setting[0]?.setting).toBe(companyA);

        await tx.$executeRawUnsafe(`
          INSERT INTO tenant_test_records (company_id, name)
          VALUES ('${companyA}', 'Committed Item')
        `);
      });

      // Verify row persisted
      await tenantDb.transaction(async (tx) => {
        const rows = await tx.$queryRawUnsafe<Array<{ name: string }>>(
          `SELECT name FROM tenant_test_records WHERE company_id = '${companyA}'`,
        );
        expect(rows.length).toBe(1);
        expect(rows[0]?.name).toBe('Committed Item');
      });
    });
  });

  it('rolls back completely if an error is thrown inside transaction (RULE-ATOMIC)', async () => {
    await clsService.run(async () => {
      clsService.set('companyId', companyA);

      await expect(
        tenantDb.transaction(async (tx) => {
          await tx.$executeRawUnsafe(`
            INSERT INTO tenant_test_records (company_id, name)
            VALUES ('${companyA}', 'Rolled Back Item')
          `);
          throw new Error('Forced rollback error');
        }),
      ).rejects.toThrow('Forced rollback error');

      // Verify row was NOT inserted
      await tenantDb.transaction(async (tx) => {
        const rows = await tx.$queryRawUnsafe<Array<{ name: string }>>(
          `SELECT name FROM tenant_test_records WHERE name = 'Rolled Back Item'`,
        );
        expect(rows.length).toBe(0);
      });
    });
  });

  it('rejects cross-tenant insert with PostgreSQL WITH CHECK violation', async () => {
    await clsService.run(async () => {
      clsService.set('companyId', companyA);

      // Attempting to insert a row with companyB while companyA context is active
      await expect(
        tenantDb.transaction(async (tx) => {
          await tx.$executeRawUnsafe(`
            INSERT INTO tenant_test_records (company_id, name)
            VALUES ('${companyB}', 'Cross Tenant Breach Attempt')
          `);
        }),
      ).rejects.toThrow(/violates row-level security policy/i);
    });
  });
});
