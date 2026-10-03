export interface QueueJob<T = unknown> {
  id: string;
  name: string;
  data: { companyId: string } & T;
  attemptsMade: number;
}

export interface QueueJobOptions {
  attempts?: number;
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
  jobId?: string;
  delay?: number;
}

export type QueueHandler<T = unknown> = (job: QueueJob<T>) => Promise<void>;

/**
 * QueueDriver Port
 * Clean-architecture boundary for asynchronous task processing.
 * Implemented by BullMqQueueDriver in Cloud mode, and DbQueueDriver in Local mode.
 */
export interface QueueDriver {
  enqueue<T = unknown>(
    queue: string,
    payload: { companyId: string } & T,
    options?: QueueJobOptions,
  ): Promise<string>;

  schedule(
    id: string,
    cron: string,
    queue: string,
    payload: Record<string, unknown>,
  ): Promise<void>;

  process<T = unknown>(queue: string, handler: QueueHandler<T>): Promise<void>;

  close(): Promise<void>;
}
