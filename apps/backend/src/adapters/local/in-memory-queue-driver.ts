import { Injectable } from '@nestjs/common';
import type {
  QueueDriver,
  QueueHandler,
  QueueJob,
  QueueJobOptions,
} from '../../ports/queue-driver.port.js';

@Injectable()
export class InMemoryQueueDriver implements QueueDriver {
  private readonly handlers = new Map<string, QueueHandler<unknown>>();
  private readonly schedules = new Map<string, { cron: string; queue: string; payload: unknown }>();

  async enqueue<T = unknown>(
    queue: string,
    payload: { companyId: string } & T,
    _options?: QueueJobOptions,
  ): Promise<string> {
    const id = crypto.randomUUID();
    const handler = this.handlers.get(queue);

    if (handler) {
      const job: QueueJob<T> = {
        id,
        name: queue,
        data: payload,
        attemptsMade: 0,
      };

      // Execute handler asynchronously so enqueue returns immediately
      setImmediate(() => {
        void handler(job as QueueJob<unknown>).catch((err) => {
          console.error(`[InMemoryQueueDriver] Error processing job ${id} on queue ${queue}:`, err);
        });
      });
    }

    return id;
  }

  async schedule(
    id: string,
    cron: string,
    queue: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    this.schedules.set(id, { cron, queue, payload });
  }

  async process<T = unknown>(queue: string, handler: QueueHandler<T>): Promise<void> {
    this.handlers.set(queue, handler as QueueHandler<unknown>);
  }

  async close(): Promise<void> {
    this.handlers.clear();
    this.schedules.clear();
  }
}
