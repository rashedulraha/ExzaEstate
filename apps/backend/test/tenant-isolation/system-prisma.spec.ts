import { Test, TestingModule } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ConfigModule } from '../../src/config/config.module.js';
import { validateEnv } from '../../src/config/env.schema.js';
import { DatabaseModule } from '../../src/database/database.module.js';
import { GLOBAL_TABLES, isGlobalTable } from '../../src/database/global-tables.js';
import { PrismaService } from '../../src/database/prisma.service.js';
import { SystemPrisma } from '../../src/database/system-prisma.service.js';

describe('S4: SystemPrisma & GLOBAL_TABLES', () => {
  let moduleRef: TestingModule;
  let systemPrisma: SystemPrisma;
  let prismaService: PrismaService;

  const companyA = '30000000-0000-0000-0000-000000000001';
  const companyB = '30000000-0000-0000-0000-000000000002';

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
      imports: [ConfigModule.forRoot(config), DatabaseModule],
      providers: [SystemPrisma],
    }).compile();

    systemPrisma = moduleRef.get<SystemPrisma>(SystemPrisma);
    prismaService = moduleRef.get<PrismaService>(PrismaService);
    await prismaService.onModuleInit();
    await systemPrisma.onModuleInit();

    // Insert records for both companies using system scope
    await systemPrisma.executeWithReason(
      '// SYSTEM-SCOPE: test fixture initialization',
      async (client) => {
        await client.$executeRawUnsafe(
          `DELETE FROM tenant_test_records WHERE company_id IN ('${companyA}', '${companyB}')`,
        );
        await client.$executeRawUnsafe(`
          INSERT INTO tenant_test_records (company_id, name)
          VALUES ('${companyA}', 'System Seed Company A'),
                 ('${companyB}', 'System Seed Company B')
        `);
      },
    );
  });

  afterAll(async () => {
    if (systemPrisma) {
      await systemPrisma.executeWithReason(
        '// SYSTEM-SCOPE: test fixture cleanup',
        async (client) => {
          await client.$executeRawUnsafe(
            `DELETE FROM tenant_test_records WHERE company_id IN ('${companyA}', '${companyB}')`,
          );
        },
      );
      await systemPrisma.onModuleDestroy();
    }
    if (prismaService) {
      await prismaService.onModuleDestroy();
    }
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  describe('GLOBAL_TABLES registry', () => {
    it('recognizes global reference tables', () => {
      expect(GLOBAL_TABLES).toContain('global_test_records');
      expect(GLOBAL_TABLES).toContain('_prisma_migrations');
      expect(isGlobalTable('global_test_records')).toBe(true);
      expect(isGlobalTable('tenant_test_records')).toBe(false);
    });
  });

  describe('SystemPrisma operations', () => {
    it('requires a non-empty SYSTEM-SCOPE reason', async () => {
      await expect(
        systemPrisma.executeWithReason('', async () => {
          return true;
        }),
      ).rejects.toThrow(/reason/i);

      await expect(
        systemPrisma.executeWithReason('missing marker reason', async () => {
          return true;
        }),
      ).rejects.toThrow(/SYSTEM-SCOPE:/);
    });

    it('can perform cross-tenant queries across companies with audit hook', async () => {
      const records = await systemPrisma.executeWithReason(
        '// SYSTEM-SCOPE: scheduled company scan',
        async (client) => {
          return client.$queryRawUnsafe<Array<{ company_id: string; name: string }>>(
            `SELECT company_id, name FROM tenant_test_records WHERE company_id IN ('${companyA}', '${companyB}') ORDER BY name ASC`,
          );
        },
      );

      expect(records.length).toBe(2);
      expect(records[0]?.name).toBe('System Seed Company A');
      expect(records[1]?.name).toBe('System Seed Company B');
    });
  });
});
