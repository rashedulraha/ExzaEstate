import { Test, TestingModule } from '@nestjs/testing';
import { ClsModule, ClsService } from 'nestjs-cls';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { RequestContext } from '../../src/common/context/request-context.service.js';
import { ConfigModule } from '../../src/config/config.module.js';
import { validateEnv } from '../../src/config/env.schema.js';
import { DatabaseModule } from '../../src/database/database.module.js';
import { GLOBAL_TABLES } from '../../src/database/global-tables.js';
import { PrismaService } from '../../src/database/prisma.service.js';
import { TenantDb } from '../../src/database/tenant-db.service.js';

interface TableCoverageRow {
  tableName: string;
  hasCompanyId: boolean;
  rowSecurity: boolean;
  forceRowSecurity: boolean;
  policyCount: number;
}

describe('S5: Isolation Suite & RLS-Coverage Test', () => {
  let moduleRef: TestingModule;
  let clsService: ClsService;
  let tenantDb: TenantDb;
  let prismaService: PrismaService;

  const companyA = '40000000-0000-0000-0000-000000000001';
  const companyB = '40000000-0000-0000-0000-000000000002';

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

    // Clean test table
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
      await prismaService.onModuleDestroy();
    }
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  describe('Cross-Tenant Data Isolation (Tenant B vs Tenant A)', () => {
    it('prevents Tenant B from reading, updating, or deleting Tenant A rows', async () => {
      // 1. Tenant A inserts a confidential record
      await clsService.run(async () => {
        clsService.set('companyId', companyA);
        await tenantDb.transaction(async (tx) => {
          await tx.$executeRawUnsafe(`
            INSERT INTO tenant_test_records (company_id, name)
            VALUES ('${companyA}', 'Tenant A Confidential Property')
          `);
        });
      });

      // 2. Tenant B attempts to read Tenant A's record -> returns 0 rows
      await clsService.run(async () => {
        clsService.set('companyId', companyB);
        await tenantDb.transaction(async (tx) => {
          const rows = await tx.$queryRawUnsafe<Array<{ name: string }>>(`
            SELECT name FROM tenant_test_records WHERE name = 'Tenant A Confidential Property'
          `);
          expect(rows.length).toBe(0);
        });
      });

      // 3. Tenant B attempts to update Tenant A's record -> 0 rows affected
      await clsService.run(async () => {
        clsService.set('companyId', companyB);
        await tenantDb.transaction(async (tx) => {
          const updatedCount = await tx.$executeRawUnsafe(`
            UPDATE tenant_test_records
            SET name = 'Tampered by Tenant B'
            WHERE company_id = '${companyA}'
          `);
          expect(updatedCount).toBe(0);
        });
      });

      // 4. Tenant B attempts to delete Tenant A's record -> 0 rows affected
      await clsService.run(async () => {
        clsService.set('companyId', companyB);
        await tenantDb.transaction(async (tx) => {
          const deletedCount = await tx.$executeRawUnsafe(`
            DELETE FROM tenant_test_records WHERE company_id = '${companyA}'
          `);
          expect(deletedCount).toBe(0);
        });
      });

      // 5. Tenant B attempts to insert a row masquerading with companyA id -> rejected by WITH CHECK
      await clsService.run(async () => {
        clsService.set('companyId', companyB);
        await expect(
          tenantDb.transaction(async (tx) => {
            await tx.$executeRawUnsafe(`
              INSERT INTO tenant_test_records (company_id, name)
              VALUES ('${companyA}', 'Forged Tenant A Record')
            `);
          }),
        ).rejects.toThrow(/violates row-level security policy/i);
      });

      // 6. Verify Tenant A's record remains completely intact and untampered
      await clsService.run(async () => {
        clsService.set('companyId', companyA);
        await tenantDb.transaction(async (tx) => {
          const rows = await tx.$queryRawUnsafe<Array<{ name: string }>>(`
            SELECT name FROM tenant_test_records WHERE company_id = '${companyA}'
          `);
          expect(rows.length).toBe(1);
          expect(rows[0]?.name).toBe('Tenant A Confidential Property');
        });
      });
    });

    it('fails closed when querying without tenant context', async () => {
      // Unset variable returns 0 rows and rejects inserts
      const rows = await prismaService.$queryRawUnsafe<Array<{ name: string }>>(`
        SELECT name FROM tenant_test_records
      `);
      expect(rows.length).toBe(0);

      await expect(
        prismaService.$executeRawUnsafe(`
          INSERT INTO tenant_test_records (company_id, name)
          VALUES ('${companyA}', 'Orphan Record')
        `),
      ).rejects.toThrow(/violates row-level security policy/i);
    });
  });

  describe('RLS Coverage Test (Database-wide Schema Verification)', () => {
    it('verifies every public table has either company_id with forced RLS or is registered in GLOBAL_TABLES', async () => {
      // Query PostgreSQL metadata for all base tables in the public schema
      const tables = await prismaService.$queryRawUnsafe<TableCoverageRow[]>(`
        SELECT
          c.relname as "tableName",
          EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = c.relname
              AND column_name = 'company_id'
          ) as "hasCompanyId",
          c.relrowsecurity as "rowSecurity",
          c.relforcerowsecurity as "forceRowSecurity",
          (
            SELECT count(*)::int
            FROM pg_policy p
            WHERE p.polrelid = c.oid
          ) as "policyCount"
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relkind = 'r'
        ORDER BY c.relname ASC;
      `);

      expect(tables.length).toBeGreaterThan(0);

      const violations: string[] = [];

      for (const table of tables) {
        const isGlobal = (GLOBAL_TABLES as readonly string[]).includes(table.tableName);

        if (isGlobal) {
          // Global reference tables must NOT have company_id
          if (table.hasCompanyId) {
            violations.push(
              `Global table "${table.tableName}" unexpectedly has a company_id column`,
            );
          }
        } else {
          // Tenant tables MUST have company_id
          if (!table.hasCompanyId) {
            violations.push(
              `Tenant table "${table.tableName}" is missing mandatory company_id column and is not in GLOBAL_TABLES`,
            );
          }

          // Tenant tables MUST have ENABLE ROW LEVEL SECURITY
          if (!table.rowSecurity) {
            violations.push(
              `Tenant table "${table.tableName}" does not have ENABLE ROW LEVEL SECURITY`,
            );
          }

          // Tenant tables MUST have FORCE ROW LEVEL SECURITY
          if (!table.forceRowSecurity) {
            violations.push(
              `Tenant table "${table.tableName}" does not have FORCE ROW LEVEL SECURITY`,
            );
          }

          // Tenant tables MUST have at least one RLS policy
          if (table.policyCount < 1) {
            violations.push(`Tenant table "${table.tableName}" has zero active RLS policies`);
          }
        }
      }

      if (violations.length > 0) {
        console.error('RLS Coverage Violations:', violations);
      }

      expect(violations).toEqual([]);
    });
  });
});
