import { Inject, Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import pg from 'pg';
import { ConfigService } from '../../config/config.service.js';
import { QUEUE_DRIVER, type QueueDriver } from '../../ports/index.js';
import type { OutboxEventRecord } from './outbox.service.js';

export type OutboxEventHandler = (
  event: OutboxEventRecord,
  ctx: { companyId: string },
) => Promise<void>;

@Injectable()
export class OutboxDispatcher implements OnModuleDestroy {
  private readonly logger = new Logger(OutboxDispatcher.name);
  private readonly pool: pg.Pool;
  private readonly handlers = new Map<string, OutboxEventHandler>();
  private timer: NodeJS.Timeout | null = null;
  private isPolling = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly clsService: ClsService,
    @Optional() @Inject(QUEUE_DRIVER) private readonly queueDriver?: QueueDriver,
  ) {
    const rawUrl =
      process.env.WORKER_DATABASE_URL ||
      this.configService.databaseUrl.replace(
        /exza_app(:[^@]*)?@/,
        'exza_worker:exza_worker_secret@',
      );

    this.pool = new pg.Pool({ connectionString: rawUrl });
  }

  /**
   * Registers an in-process handler for an event name.
   */
  registerHandler(eventName: string, handler: OutboxEventHandler): void {
    this.handlers.set(eventName, handler);
  }

  private async executeEvent(event: OutboxEventRecord): Promise<void> {
    const handler = this.handlers.get(event.eventName);
    if (handler) {
      await this.clsService.run(async () => {
        this.clsService.set('companyId', event.companyId);
        await handler(event, { companyId: event.companyId });
      });
      return;
    }

    if (this.queueDriver) {
      await this.queueDriver.enqueue(event.eventName, {
        ...event.payload,
        _eventId: event.id,
        companyId: event.companyId,
      });
    }
  }

  private async handleSingleEvent(client: pg.PoolClient, event: OutboxEventRecord): Promise<void> {
    const nextAttempts = event.attempts + 1;
    try {
      await this.executeEvent(event);
      await client.query(
        `UPDATE outbox_events
         SET status = 'PROCESSED',
             attempts = $1,
             processed_at = now()
         WHERE id = $2`,
        [nextAttempts, event.id],
      );
    } catch (err) {
      const nextStatus = nextAttempts >= 3 ? 'FAILED' : 'PENDING';
      await client.query(
        `UPDATE outbox_events
         SET status = $1,
             attempts = $2,
             processed_at = ${nextStatus === 'FAILED' ? 'now()' : 'NULL'}
         WHERE id = $3`,
        [nextStatus, nextAttempts, event.id],
      );

      this.logger.warn(
        `Outbox event ${event.id} (${event.eventName}) attempt ${nextAttempts} failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Dispatches a single batch of pending outbox events using SELECT ... FOR UPDATE SKIP LOCKED.
   * Runs as exza_worker; executes handlers with the event's companyId set in CLS.
   */
  async dispatchBatch(batchSize: number = 50): Promise<number> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const res = await client.query<OutboxEventRecord>(
        `SELECT
           id,
           company_id as "companyId",
           event_name as "eventName",
           payload,
           status,
           attempts,
           created_at as "createdAt",
           processed_at as "processedAt"
         FROM outbox_events
         WHERE status = 'PENDING'
         ORDER BY created_at ASC
         LIMIT $1
         FOR UPDATE SKIP LOCKED`,
        [batchSize],
      );

      for (const event of res.rows) {
        await this.handleSingleEvent(client, event);
      }

      await client.query('COMMIT');
      return res.rows.length;
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error during dispatchBatch transaction', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Returns the lag in ms of the oldest pending outbox event.
   */
  async getOutboxLagMs(): Promise<number> {
    const res = await this.pool.query<{ oldest: Date | null }>(
      `SELECT MIN(created_at) as oldest FROM outbox_events WHERE status = 'PENDING'`,
    );

    const oldest = res.rows[0]?.oldest;
    if (!oldest) {
      return 0;
    }

    return Math.max(0, Date.now() - new Date(oldest).getTime());
  }

  /**
   * Returns dead-letter outbox events for admin monitoring.
   */
  async getDeadLetterEvents(limit: number = 50, offset: number = 0): Promise<OutboxEventRecord[]> {
    const res = await this.pool.query<OutboxEventRecord>(
      `SELECT
         id,
         company_id as "companyId",
         event_name as "eventName",
         payload,
         status,
         attempts,
         created_at as "createdAt",
         processed_at as "processedAt"
       FROM outbox_events
       WHERE status = 'FAILED'
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    );

    return res.rows;
  }

  /**
   * Starts background polling loop.
   */
  start(pollIntervalMs: number = 1000): void {
    if (this.timer) return;
    this.timer = setInterval(async () => {
      if (this.isPolling) return;
      this.isPolling = true;
      try {
        await this.dispatchBatch();
      } catch (err) {
        this.logger.error('Error in outbox dispatcher poll loop', err);
      } finally {
        this.isPolling = false;
      }
    }, pollIntervalMs);
    this.logger.log(`OutboxDispatcher started (poll interval: ${pollIntervalMs}ms)`);
  }

  /**
   * Cleans up timer and closes database pool.
   */
  async close(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (!this.pool.ended) {
      await this.pool.end();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.close();
  }
}
