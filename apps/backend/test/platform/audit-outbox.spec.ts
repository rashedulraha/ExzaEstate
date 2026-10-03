import { Test, TestingModule } from '@nestjs/testing';
import { ClsModule, ClsService } from 'nestjs-cls';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { RequestContext } from '../../src/common/context/request-context.service.js';
import { ConfigModule } from '../../src/config/config.module.js';
import { validateEnv } from '../../src/config/env.schema.js';
import { DatabaseModule } from '../../src/database/database.module.js';
import { PrismaService } from '../../src/database/prisma.service.js';
import { TenantDb } from '../../src/database/tenant-db.service.js';
import { AuditService } from '../../src/platform/audit/audit.service.js';
import { OutboxService } from '../../src/platform/outbox/outbox.service.js';

describe('S2: Audit & Outbox Services (Tier 1 Integration)', () => {
  let moduleRef: TestingModule;
  let clsService: ClsService;
  let tenantDb: TenantDb;
  let prismaService: PrismaService;
  let auditService: AuditService;
  let outboxService: OutboxService;

  const companyA = crypto.randomUUID();
  const userA = crypto.randomUUID();

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
      providers: [RequestContext, TenantDb, AuditService, OutboxService],
    }).compile();

    clsService = moduleRef.get<ClsService>(ClsService);
    tenantDb = moduleRef.get<TenantDb>(TenantDb);
    prismaService = moduleRef.get<PrismaService>(PrismaService);
    auditService = moduleRef.get<AuditService>(AuditService);
    outboxService = moduleRef.get<OutboxService>(OutboxService);

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

  describe('AuditService', () => {
    it('records an audit log synchronously inside the caller transaction', async () => {
      const recordId = crypto.randomUUID();

      await clsService.run(async () => {
        clsService.set('companyId', companyA);
        clsService.set('userId', userA);
        clsService.set('requestId', 'req-audit-test-1');

        await tenantDb.transaction(async (tx) => {
          // 1. Business operation (e.g. insert test record)
          await tx.$executeRawUnsafe(`
            INSERT INTO tenant_test_records (id, company_id, name)
            VALUES ('${recordId}', '${companyA}', 'Audited Property')
          `);

          // 2. Audit record inside same transaction
          await auditService.record(tx, {
            module: 'property',
            recordType: 'Property',
            recordId,
            action: 'CREATE',
            newValue: { name: 'Audited Property' },
            reason: 'Initial creation',
          });
        });

        // 3. Verify audit log was committed and is readable
        await tenantDb.transaction(async (tx) => {
          const logs = await tx.$queryRawUnsafe<
            Array<{
              record_id: string;
              action: string;
              module: string;
              actor_id: string;
              request_id: string;
            }>
          >(`
            SELECT record_id, action, module, actor_id, request_id
            FROM audit_logs
            WHERE record_id = '${recordId}'
          `);

          expect(logs.length).toBe(1);
          expect(logs[0]?.action).toBe('CREATE');
          expect(logs[0]?.module).toBe('property');
          expect(logs[0]?.actor_id).toBe(userA);
          expect(logs[0]?.request_id).toBe('req-audit-test-1');
        });
      });
    });

    it('enforces RULE-ATOMIC: rolled back transaction burns zero audit logs', async () => {
      const recordId = crypto.randomUUID();

      await clsService.run(async () => {
        clsService.set('companyId', companyA);
        clsService.set('userId', userA);

        await expect(
          tenantDb.transaction(async (tx) => {
            await tx.$executeRawUnsafe(`
              INSERT INTO tenant_test_records (id, company_id, name)
              VALUES ('${recordId}', '${companyA}', 'Rollback Property')
            `);

            await auditService.record(tx, {
              module: 'property',
              recordType: 'Property',
              recordId,
              action: 'CREATE',
            });

            throw new Error('Forced rollback in business logic');
          }),
        ).rejects.toThrow('Forced rollback in business logic');

        // Verify neither business record nor audit log exists
        await tenantDb.transaction(async (tx) => {
          const bizRows = await tx.$queryRawUnsafe<Array<unknown>>(`
            SELECT id FROM tenant_test_records WHERE id = '${recordId}'
          `);
          expect(bizRows.length).toBe(0);

          const auditRows = await tx.$queryRawUnsafe<Array<unknown>>(`
            SELECT id FROM audit_logs WHERE record_id = '${recordId}'
          `);
          expect(auditRows.length).toBe(0);
        });
      });
    });

    it('AT-32: forcing the audit write to fail rolls the business change back', async () => {
      const recordId = crypto.randomUUID();

      await clsService.run(async () => {
        clsService.set('companyId', companyA);
        clsService.set('userId', userA);

        await expect(
          tenantDb.transaction(async (tx) => {
            // 1. Business operation
            await tx.$executeRawUnsafe(`
              INSERT INTO tenant_test_records (id, company_id, name)
              VALUES ('${recordId}', '${companyA}', 'Un-audited Business Row')
            `);

            // 2. Audit write fails (e.g. invalid recordId format / null required constraint violation)
            await auditService.record(tx, {
              module: 'property',
              recordType: 'Property',
              recordId: 'invalid-non-uuid', // causes Postgres UUID syntax error
              action: 'CREATE',
            });
          }),
        ).rejects.toThrow();

        // 3. Verify business row was rolled back (RULE-ATOMIC & AT-32)
        await tenantDb.transaction(async (tx) => {
          const bizRows = await tx.$queryRawUnsafe<Array<unknown>>(`
            SELECT id FROM tenant_test_records WHERE id = '${recordId}'
          `);
          expect(bizRows.length).toBe(0);
        });
      });
    });

    it('enforces RULE-IMMUTABLE: audit_logs cannot be updated or deleted (blocked by trigger and permissions)', async () => {
      const recordId = crypto.randomUUID();

      await clsService.run(async () => {
        clsService.set('companyId', companyA);
        clsService.set('userId', userA);

        await tenantDb.transaction(async (tx) => {
          await auditService.record(tx, {
            module: 'property',
            recordType: 'Property',
            recordId,
            action: 'CREATE',
          });
        });

        // Attempt to update audit log -> rejected
        await expect(
          tenantDb.transaction(async (tx) => {
            await tx.$executeRawUnsafe(`
              UPDATE audit_logs
              SET action = 'TAMPERED'
              WHERE record_id = '${recordId}'
            `);
          }),
        ).rejects.toThrow();

        // Attempt to delete audit log -> rejected
        await expect(
          tenantDb.transaction(async (tx) => {
            await tx.$executeRawUnsafe(`
              DELETE FROM audit_logs
              WHERE record_id = '${recordId}'
            `);
          }),
        ).rejects.toThrow();
      });
    });
  });

  describe('OutboxService', () => {
    it('emits an outbox event synchronously inside the caller transaction', async () => {
      const eventName = 'booking.confirmed';
      const payload = { bookingId: 'b-123', amount: '50000000' };

      await clsService.run(async () => {
        clsService.set('companyId', companyA);
        clsService.set('userId', userA);

        let emittedEventId: string | undefined;

        await tenantDb.transaction(async (tx) => {
          const event = await outboxService.emit(tx, eventName, payload);
          emittedEventId = event.id;
          expect(event.eventName).toBe(eventName);
          expect(event.status).toBe('PENDING');
          expect(event.attempts).toBe(0);
        });

        expect(emittedEventId).toBeDefined();

        // Verify outbox event is persisted with PENDING status
        await tenantDb.transaction(async (tx) => {
          const rows = await tx.$queryRawUnsafe<
            Array<{ id: string; event_name: string; status: string; attempts: number }>
          >(`
            SELECT id, event_name, status, attempts
            FROM outbox_events
            WHERE id = '${emittedEventId}'
          `);

          expect(rows.length).toBe(1);
          expect(rows[0]?.event_name).toBe(eventName);
          expect(rows[0]?.status).toBe('PENDING');
          expect(rows[0]?.attempts).toBe(0);
        });
      });
    });

    it('enforces RULE-ATOMIC: rolled back transaction burns zero outbox events', async () => {
      await clsService.run(async () => {
        clsService.set('companyId', companyA);

        const testEvent = 'payment.posted';
        const marker = 'rollback-outbox-marker-999';

        await expect(
          tenantDb.transaction(async (tx) => {
            await outboxService.emit(tx, testEvent, { marker });
            throw new Error('Rollback outbox transaction');
          }),
        ).rejects.toThrow('Rollback outbox transaction');

        await tenantDb.transaction(async (tx) => {
          const rows = await tx.$queryRawUnsafe<Array<unknown>>(`
            SELECT id FROM outbox_events WHERE payload->>'marker' = '${marker}'
          `);
          expect(rows.length).toBe(0);
        });
      });
    });

    it('allows exza_worker to read outbox events across companies via dedicated policy', async () => {
      // Create an outbox event
      let outboxId: string | undefined;
      await clsService.run(async () => {
        clsService.set('companyId', companyA);
        await tenantDb.transaction(async (tx) => {
          const event = await outboxService.emit(tx, 'installment.overdue', {
            notice: 'worker-scope-test',
          });
          outboxId = event.id;
        });
      });

      expect(outboxId).toBeDefined();

      // Connect as exza_worker (NOBYPASSRLS) without setting app.current_company_id
      const { Pool } = await import('pg');
      const workerPool = new Pool({
        connectionString:
          process.env.WORKER_DATABASE_URL ||
          'postgresql://exza_worker:exza_worker_secret@localhost:5432/exzaestate?schema=public',
      });

      try {
        const res = await workerPool.query(
          `SELECT id, event_name, company_id, status FROM outbox_events WHERE id = $1`,
          [outboxId],
        );
        expect(res.rows.length).toBe(1);
        expect(res.rows[0].id).toBe(outboxId);
        expect(res.rows[0].event_name).toBe('installment.overdue');
      } finally {
        await workerPool.end();
      }
    });
  });
});
