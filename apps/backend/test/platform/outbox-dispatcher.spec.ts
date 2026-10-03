import { Test, TestingModule } from '@nestjs/testing';
import { ClsModule, ClsService } from 'nestjs-cls';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { RequestContext } from '../../src/common/context/request-context.service.js';
import { ConfigModule } from '../../src/config/config.module.js';
import { validateEnv } from '../../src/config/env.schema.js';
import { DatabaseModule } from '../../src/database/database.module.js';
import { PrismaService } from '../../src/database/prisma.service.js';
import { TenantDb } from '../../src/database/tenant-db.service.js';
import { PerCompanyScheduler } from '../../src/jobs/per-company.scheduler.js';
import { OutboxDispatcher } from '../../src/platform/outbox/outbox.dispatcher.js';
import { OutboxService } from '../../src/platform/outbox/outbox.service.js';
import { QUEUE_DRIVER, type QueueDriver } from '../../src/ports/index.js';

describe('S4: Outbox Dispatcher, Worker & Per-Company Scheduler', () => {
  let moduleRef: TestingModule;
  let clsService: ClsService;
  let tenantDb: TenantDb;
  let prismaService: PrismaService;
  let outboxService: OutboxService;
  let dispatcher: OutboxDispatcher;
  let scheduler: PerCompanyScheduler;
  let queueDriver: QueueDriver;

  let companyA: string;

  beforeEach(() => {
    companyA = crypto.randomUUID();
  });

  beforeAll(async () => {
    const env = validateEnv({
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
      STORAGE_ENDPOINT: process.env.STORAGE_ENDPOINT || 'http://localhost:9000',
      STORAGE_BUCKET: process.env.STORAGE_BUCKET || 'exzaestate-documents',
      STORAGE_ACCESS_KEY: process.env.STORAGE_ACCESS_KEY || 'minioadmin',
      STORAGE_SECRET_KEY: process.env.STORAGE_SECRET_KEY || 'minioadmin',
      STORAGE_FORCE_PATH_STYLE: 'true',
    });

    const mockQueueDriver: QueueDriver = {
      enqueue: async () => 'job-123',
      schedule: async () => {},
      process: async () => {},
      close: async () => {},
    };

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot(env),
        ClsModule.forRoot({
          global: true,
          middleware: { mount: false },
        }),
        DatabaseModule,
      ],
      providers: [
        RequestContext,
        TenantDb,
        OutboxService,
        OutboxDispatcher,
        PerCompanyScheduler,
        { provide: QUEUE_DRIVER, useValue: mockQueueDriver },
      ],
    }).compile();

    clsService = moduleRef.get<ClsService>(ClsService);
    tenantDb = moduleRef.get<TenantDb>(TenantDb);
    prismaService = moduleRef.get<PrismaService>(PrismaService);
    outboxService = moduleRef.get<OutboxService>(OutboxService);
    dispatcher = moduleRef.get<OutboxDispatcher>(OutboxDispatcher);
    scheduler = moduleRef.get<PerCompanyScheduler>(PerCompanyScheduler);
    queueDriver = moduleRef.get<QueueDriver>(QUEUE_DRIVER);

    await prismaService.onModuleInit();
  });

  afterAll(async () => {
    if (dispatcher) await dispatcher.close();
    if (prismaService) await prismaService.onModuleDestroy();
    if (moduleRef) await moduleRef.close();
  });

  it('dispatches pending outbox event with companyId in context and marks PROCESSED', async () => {
    const eventName = 'booking.confirmed';
    const payload = { bookingId: crypto.randomUUID(), amount: '15000000' };

    let eventId: string | undefined;

    // 1. Emit event inside company transaction
    await clsService.run(async () => {
      clsService.set('companyId', companyA);
      await tenantDb.transaction(async (tx) => {
        const ev = await outboxService.emit(tx, eventName, payload);
        eventId = ev.id;
      });
    });

    expect(eventId).toBeDefined();

    // 2. Register handler on dispatcher
    let handledPayload: unknown = null;
    let handledCompanyId: string | undefined;

    dispatcher.registerHandler(eventName, async (event, ctx) => {
      handledPayload = event.payload;
      handledCompanyId = ctx.companyId;
    });

    // 3. Run single dispatch batch
    const processedCount = await dispatcher.dispatchBatch();
    expect(processedCount).toBeGreaterThanOrEqual(1);

    expect(handledPayload).toEqual(payload);
    expect(handledCompanyId).toBe(companyA);

    // 4. Verify DB status is now PROCESSED
    let rows: Array<{ status: string; attempts: number; processed_at: Date | null }> = [];
    await clsService.run(async () => {
      clsService.set('companyId', companyA);
      await tenantDb.transaction(async (tx) => {
        rows = await tx.$queryRawUnsafe<
          Array<{ status: string; attempts: number; processed_at: Date | null }>
        >(`
          SELECT status, attempts, processed_at
          FROM outbox_events
          WHERE id = '${eventId}'
        `);
      });
    });

    expect(rows[0]?.status).toBe('PROCESSED');
    expect(rows[0]?.attempts).toBe(1);
    expect(rows[0]?.processed_at).not.toBeNull();
  });

  it('retries failing handlers and transitions to FAILED (dead-letter) after 3 attempts', async () => {
    const eventName = 'payment.bounced';
    const payload = { paymentId: crypto.randomUUID() };

    let eventId: string | undefined;

    await clsService.run(async () => {
      clsService.set('companyId', companyA);
      await tenantDb.transaction(async (tx) => {
        const ev = await outboxService.emit(tx, eventName, payload);
        eventId = ev.id;
      });
    });

    expect(eventId).toBeDefined();

    // Handler that always fails
    dispatcher.registerHandler(eventName, async () => {
      throw new Error('Simulated external service timeout');
    });

    const getStatusAndAttempts = async () => {
      let result: Array<{ status: string; attempts: number }> = [];
      await clsService.run(async () => {
        clsService.set('companyId', companyA);
        await tenantDb.transaction(async (tx) => {
          result = await tx.$queryRawUnsafe<Array<{ status: string; attempts: number }>>(
            `SELECT status, attempts FROM outbox_events WHERE id = '${eventId}'`,
          );
        });
      });
      return result;
    };

    // Attempt 1
    await dispatcher.dispatchBatch();
    let rows = await getStatusAndAttempts();
    expect(rows[0]?.status).toBe('PENDING');
    expect(rows[0]?.attempts).toBe(1);

    // Attempt 2
    await dispatcher.dispatchBatch();
    rows = await getStatusAndAttempts();
    expect(rows[0]?.status).toBe('PENDING');
    expect(rows[0]?.attempts).toBe(2);

    // Attempt 3 -> Dead-letter status FAILED
    await dispatcher.dispatchBatch();
    rows = await getStatusAndAttempts();
    expect(rows[0]?.status).toBe('FAILED');
    expect(rows[0]?.attempts).toBe(3);
  });

  it('calculates outbox lag metric (age in ms of oldest pending event)', async () => {
    const lag = await dispatcher.getOutboxLagMs();
    expect(typeof lag).toBe('number');
    expect(lag).toBeGreaterThanOrEqual(0);
  });

  it('PerCompanyScheduler fans out one job per active company', async () => {
    const activeCompanies = [crypto.randomUUID(), crypto.randomUUID()];
    const enqueuedJobs: Array<{ queue: string; companyId: string }> = [];

    const originalEnqueue = queueDriver.enqueue;
    queueDriver.enqueue = async (queue, data) => {
      enqueuedJobs.push({ queue, companyId: data.companyId });
      return 'job-fanout';
    };

    try {
      await scheduler.fanOutToCompanies(activeCompanies, 'overdue-calculation', {
        date: '2026-10-03',
      });

      expect(enqueuedJobs.length).toBe(2);
      expect(enqueuedJobs[0]?.companyId).toBe(activeCompanies[0]);
      expect(enqueuedJobs[1]?.companyId).toBe(activeCompanies[1]);
      expect(enqueuedJobs[0]?.queue).toBe('overdue-calculation');
    } finally {
      queueDriver.enqueue = originalEnqueue;
    }
  });
});
