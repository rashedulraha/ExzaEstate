import { Test, TestingModule } from '@nestjs/testing';
import { ClsModule, ClsService } from 'nestjs-cls';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { RequestContext } from '../../src/common/context/request-context.service.js';
import { ConfigModule } from '../../src/config/config.module.js';
import { validateEnv } from '../../src/config/env.schema.js';
import { DatabaseModule } from '../../src/database/database.module.js';
import { PrismaService } from '../../src/database/prisma.service.js';
import { TenantDb } from '../../src/database/tenant-db.service.js';
import { SequenceService } from '../../src/platform/sequence/sequence.service.js';

describe('S3: Gapless Sequence Service (Tier 1 Integration & Concurrency)', () => {
  let moduleRef: TestingModule;
  let clsService: ClsService;
  let tenantDb: TenantDb;
  let prismaService: PrismaService;
  let sequenceService: SequenceService;

  let companyA: string;

  beforeEach(() => {
    companyA = crypto.randomUUID();
  });

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
      providers: [RequestContext, TenantDb, SequenceService],
    }).compile();

    clsService = moduleRef.get<ClsService>(ClsService);
    tenantDb = moduleRef.get<TenantDb>(TenantDb);
    prismaService = moduleRef.get<PrismaService>(PrismaService);
    sequenceService = moduleRef.get<SequenceService>(SequenceService);

    await prismaService.onModuleInit();
  });

  afterAll(async () => {
    if (prismaService) {
      await prismaService.onModuleDestroy();
    }
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  it('generates sequential numbers starting from 1', async () => {
    await clsService.run(async () => {
      clsService.set('companyId', companyA);

      const type = 'BOOKING';
      const fiscalYear = '2026-2027';

      const n1 = await tenantDb.transaction(async (tx) => {
        return sequenceService.next(tx, { type, fiscalYear });
      });

      const n2 = await tenantDb.transaction(async (tx) => {
        return sequenceService.next(tx, { type, fiscalYear });
      });

      expect(n1).toBe(1n);
      expect(n2).toBe(2n);
    });
  });

  it('isolates sequences across different types, fiscal years, or scopes', async () => {
    await clsService.run(async () => {
      clsService.set('companyId', companyA);

      const nBooking = await tenantDb.transaction(async (tx) => {
        return sequenceService.next(tx, { type: 'VOUCHER', fiscalYear: '2026-2027' });
      });

      const nNextYear = await tenantDb.transaction(async (tx) => {
        return sequenceService.next(tx, { type: 'VOUCHER', fiscalYear: '2027-2028' });
      });

      const nBranchScope = await tenantDb.transaction(async (tx) => {
        return sequenceService.next(tx, {
          type: 'VOUCHER',
          fiscalYear: '2026-2027',
          scopeKey: 'branch-101',
        });
      });

      expect(nBooking).toBe(1n);
      expect(nNextYear).toBe(1n);
      expect(nBranchScope).toBe(1n);
    });
  });

  it('enforces RULE-ATOMIC: rolled back transaction burns zero sequence numbers', async () => {
    await clsService.run(async () => {
      clsService.set('companyId', companyA);

      const type = 'RECEIPT';
      const fiscalYear = '2026-2027';

      // 1. First successful allocation
      const first = await tenantDb.transaction(async (tx) => {
        return sequenceService.next(tx, { type, fiscalYear });
      });
      expect(first).toBe(1n);

      // 2. Aborted transaction that calls next()
      await expect(
        tenantDb.transaction(async (tx) => {
          await sequenceService.next(tx, { type, fiscalYear });
          throw new Error('Transaction abort after sequence allocation');
        }),
      ).rejects.toThrow('Transaction abort after sequence allocation');

      // 3. Next transaction must receive 2n (no burned sequence number!)
      const nextAfterRollback = await tenantDb.transaction(async (tx) => {
        return sequenceService.next(tx, { type, fiscalYear });
      });
      expect(nextAfterRollback).toBe(2n);
    });
  });

  it('handles 10 concurrent next() calls returning 1..10 with zero gaps and zero duplicates', async () => {
    await clsService.run(async () => {
      clsService.set('companyId', companyA);

      const type = 'AGREEMENT';
      const fiscalYear = '2026-2027';

      // Launch 10 concurrent requests
      const promises = Array.from({ length: 10 }, () =>
        clsService.run(async () => {
          clsService.set('companyId', companyA);
          return tenantDb.transaction(async (tx) => {
            return sequenceService.next(tx, { type, fiscalYear });
          });
        }),
      );

      const results = await Promise.all(promises);

      // Map BigInt to numbers for assertions
      const numbers = results.map((n) => Number(n)).sort((a, b) => a - b);

      // Verify exact sequence 1..10 with no gaps and no duplicates
      expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });
  });

  it('formats document numbers according to formatting rules', () => {
    const formatted = sequenceService.format({
      prefix: 'BKG',
      fiscalYear: '2026-2027',
      scopeKey: 'DHK',
      value: 42n,
      padding: 5,
    });

    expect(formatted).toBe('BKG-2026-2027-DHK-00042');
  });
});
