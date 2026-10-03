import { Injectable } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { ConfigService } from '../../config/config.service.js';
import type {
  QueueDriver,
  QueueHandler,
  QueueJob,
  QueueJobOptions,
} from '../../ports/queue-driver.port.js';

@Injectable()
export class BullMqQueueDriver implements QueueDriver {
  private readonly redisUrl: string;
  private readonly queues = new Map<string, Queue>();
  private readonly workers: Worker[] = [];

  constructor(private readonly config: ConfigService) {
    this.redisUrl = this.config.get('REDIS_URL');
  }

  private createConnection(): Redis {
    return new Redis(this.redisUrl, { maxRetriesPerRequest: null });
  }

  private getQueue(name: string): Queue {
    let queue = this.queues.get(name);
    if (!queue) {
      queue = new Queue(name, {
        connection: this.createConnection(),
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      });
      this.queues.set(name, queue);
    }
    return queue;
  }

  async enqueue<T = unknown>(
    queueName: string,
    payload: { companyId: string } & T,
    options?: QueueJobOptions,
  ): Promise<string> {
    const queue = this.getQueue(queueName);
    const job = await queue.add(queueName, payload, {
      attempts: options?.attempts,
      backoff: options?.backoff,
      jobId: options?.jobId,
      delay: options?.delay,
    });

    return job.id ?? crypto.randomUUID();
  }

  async schedule(
    id: string,
    cron: string,
    queueName: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.upsertJobScheduler(
      id,
      { pattern: cron },
      {
        name: `${queueName}-scheduled`,
        data: payload,
      },
    );
  }

  async process<T = unknown>(queueName: string, handler: QueueHandler<T>): Promise<void> {
    const worker = new Worker<{ companyId: string } & T>(
      queueName,
      async (bullJob) => {
        const queueJob: QueueJob<T> = {
          id: bullJob.id ?? crypto.randomUUID(),
          name: bullJob.name,
          data: bullJob.data,
          attemptsMade: bullJob.attemptsMade,
        };
        await handler(queueJob);
      },
      {
        connection: this.createConnection(),
        concurrency: 5,
      },
    );

    this.workers.push(worker);
  }

  async close(): Promise<void> {
    for (const worker of this.workers) {
      await worker.close();
    }
    for (const queue of this.queues.values()) {
      await queue.close();
    }
  }
}
