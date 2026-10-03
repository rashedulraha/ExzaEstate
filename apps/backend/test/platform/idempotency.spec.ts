import { Test, TestingModule } from '@nestjs/testing';
import { ClsModule, ClsService } from 'nestjs-cls';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { RequestContext } from '../../src/common/context/request-context.service.js';
import { ConfigModule } from '../../src/config/config.module.js';
import { validateEnv } from '../../src/config/env.schema.js';
import { DatabaseModule } from '../../src/database/database.module.js';
import { PrismaService } from '../../src/database/prisma.service.js';
import { TenantDb } from '../../src/database/tenant-db.service.js';
import {
  IdempotencyKeyReusedException,
  RequestInProgressException,
} from '../../src/platform/idempotency/idempotency.exceptions.js';
import { IdempotencyService } from '../../src/platform/idempotency/idempotency.service.js';

describe('S4: Idempotency Service (Tier 1 Integration & Concurrency)', () => {
  let moduleRef: TestingModule;
  let clsService: ClsService;
  let tenantDb: TenantDb;
  let prismaService: PrismaService;
  let idempotencyService: IdempotencyService;

  let companyA: string;
  let userA: string;

  beforeEach(() => {
    companyA = crypto.randomUUID();
    userA = crypto.randomUUID();
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
      providers: [RequestContext, TenantDb, IdempotencyService],
    }).compile();

    clsService = moduleRef.get<ClsService>(ClsService);
    tenantDb = moduleRef.get<TenantDb>(TenantDb);
    prismaService = moduleRef.get<PrismaService>(PrismaService);
    idempotencyService = moduleRef.get<IdempotencyService>(IdempotencyService);

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

  it('executes primary request and saves response upon complete()', async () => {
    const key = 'idem-test-key-1';
    const requestHash = 'hash-abc-123';
    const method = 'POST';
    const routePattern = '/api/v1/bookings';
    const bizId = crypto.randomUUID();

    await clsService.run(async () => {
      clsService.set('companyId', companyA);
      clsService.set('userId', userA);

      const result = await tenantDb.transaction(async (tx) => {
        const begin = await idempotencyService.begin(tx, {
          key,
          requestHash,
          method,
          routePattern,
        });

        expect(begin.replayed).toBe(false);

        // Perform business write
        await tx.$executeRawUnsafe(`
          INSERT INTO tenant_test_records (id, company_id, name)
          VALUES ('${bizId}', '${companyA}', 'Idempotent Booking 1')
        `);

        const response = { status: 201, body: { id: bizId, status: 'CONFIRMED' } };
        await idempotencyService.complete(tx, {
          key,
          method,
          routePattern,
          status: response.status,
          body: response.body,
        });

        return response;
      });

      expect(result.status).toBe(201);
      expect(result.body.status).toBe('CONFIRMED');

      // Second identical request returns stored response (replayed)
      const replayed = await tenantDb.transaction(async (tx) => {
        const begin = await idempotencyService.begin(tx, {
          key,
          requestHash,
          method,
          routePattern,
        });

        expect(begin.replayed).toBe(true);
        expect(begin.status).toBe(201);
        expect(begin.body).toEqual({ id: bizId, status: 'CONFIRMED' });

        return begin;
      });

      expect(replayed.replayed).toBe(true);
    });
  });

  it('rejects reuse of the same idempotency key with different payload hash (IDEMPOTENCY_KEY_REUSED, 422)', async () => {
    const key = 'idem-test-key-reuse';
    const initialHash = 'hash-initial';
    const alteredHash = 'hash-tampered-payload';
    const method = 'POST';
    const routePattern = '/api/v1/payments';

    await clsService.run(async () => {
      clsService.set('companyId', companyA);
      clsService.set('userId', userA);

      // 1. Initial request commits successfully
      await tenantDb.transaction(async (tx) => {
        await idempotencyService.begin(tx, {
          key,
          requestHash: initialHash,
          method,
          routePattern,
        });

        await idempotencyService.complete(tx, {
          key,
          method,
          routePattern,
          status: 200,
          body: { paid: true },
        });
      });

      // 2. Subsequent request with altered body hash -> throws IdempotencyKeyReusedException
      await expect(
        tenantDb.transaction(async (tx) => {
          return idempotencyService.begin(tx, {
            key,
            requestHash: alteredHash,
            method,
            routePattern,
          });
        }),
      ).rejects.toThrow(IdempotencyKeyReusedException);
    });
  });

  it('enforces RULE-ATOMIC: rolled back transaction leaves no idempotency record', async () => {
    const key = 'idem-test-key-rollback';
    const requestHash = 'hash-rollback';
    const method = 'POST';
    const routePattern = '/api/v1/refunds';

    await clsService.run(async () => {
      clsService.set('companyId', companyA);
      clsService.set('userId', userA);

      // Failed transaction
      await expect(
        tenantDb.transaction(async (tx) => {
          await idempotencyService.begin(tx, {
            key,
            requestHash,
            method,
            routePattern,
          });
          throw new Error('Business validation failed inside transaction');
        }),
      ).rejects.toThrow('Business validation failed inside transaction');

      // The key is free to be used again without conflict
      const retryResult = await tenantDb.transaction(async (tx) => {
        const begin = await idempotencyService.begin(tx, {
          key,
          requestHash,
          method,
          routePattern,
        });
        expect(begin.replayed).toBe(false);

        await idempotencyService.complete(tx, {
          key,
          method,
          routePattern,
          status: 200,
          body: { refunded: true },
        });
        return { success: true };
      });

      expect(retryResult.success).toBe(true);
    });
  });

  it('handles concurrent identical requests: exactly one executes business row, other gets replayed response', async () => {
    const key = 'idem-test-key-concurrent';
    const requestHash = 'hash-concurrent';
    const method = 'POST';
    const routePattern = '/api/v1/bookings';
    const recordId = crypto.randomUUID();

    await clsService.run(async () => {
      clsService.set('companyId', companyA);
      clsService.set('userId', userA);

      // Run two concurrent requests with identical key and payload
      const runRequest = async () => {
        return clsService.run(async () => {
          clsService.set('companyId', companyA);
          clsService.set('userId', userA);

          return tenantDb.transaction(async (tx) => {
            const begin = await idempotencyService.begin(tx, {
              key,
              requestHash,
              method,
              routePattern,
            });

            if (begin.replayed) {
              return { replayed: true, body: begin.body, status: begin.status };
            }

            // Small delay to simulate business logic execution while holding lock
            await new Promise((resolve) => setTimeout(resolve, 50));

            // Business write
            await tx.$executeRawUnsafe(`
              INSERT INTO tenant_test_records (id, company_id, name)
              VALUES ('${recordId}', '${companyA}', 'Concurrent Idempotent Booking')
            `);

            const response = { id: recordId, status: 'CONFIRMED' };
            await idempotencyService.complete(tx, {
              key,
              method,
              routePattern,
              status: 201,
              body: response,
            });

            return { replayed: false, body: response, status: 201 };
          });
        });
      };

      const [res1, res2] = await Promise.all([runRequest(), runRequest()]);

      // Exactly one was primary write, exactly one was replayed
      const primaryCount = [res1, res2].filter((r) => !r.replayed).length;
      const replayedCount = [res1, res2].filter((r) => r.replayed).length;

      expect(primaryCount).toBe(1);
      expect(replayedCount).toBe(1);

      // Total business rows in database must be exactly 1
      await tenantDb.transaction(async (tx) => {
        const rows = await tx.$queryRawUnsafe<Array<unknown>>(`
          SELECT id FROM tenant_test_records WHERE id = '${recordId}'
        `);
        expect(rows.length).toBe(1);
      });
    });
  });

  it('throws REQUEST_IN_PROGRESS (HTTP 409) when concurrent request lock times out', async () => {
    const key = 'idem-test-key-timeout';
    const requestHash = 'hash-timeout';
    const method = 'POST';
    const routePattern = '/api/v1/bookings';

    await clsService.run(async () => {
      clsService.set('companyId', companyA);
      clsService.set('userId', userA);

      // Start transaction 1 that acquires row lock and holds it
      const releaseTx1Promise = new Promise<void>((resolve) => {
        setTimeout(resolve, 300);
      });

      const tx1Promise = tenantDb.transaction(async (tx) => {
        await idempotencyService.begin(tx, {
          key,
          requestHash,
          method,
          routePattern,
        });

        // Hold until after tx2 times out
        await releaseTx1Promise;

        await idempotencyService.complete(tx, {
          key,
          method,
          routePattern,
          status: 200,
          body: { done: true },
        });
      });

      // Give tx1 a moment to acquire the lock
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Transaction 2 tries to begin with a very short lockTimeoutMs (100ms)
      const tx2Promise = tenantDb.transaction(async (tx) => {
        return idempotencyService.begin(tx, {
          key,
          requestHash,
          method,
          routePattern,
          lockTimeoutMs: 100, // short timeout for testing
        });
      });

      await expect(tx2Promise).rejects.toThrow(RequestInProgressException);
      await tx1Promise;
    });
  });
});
