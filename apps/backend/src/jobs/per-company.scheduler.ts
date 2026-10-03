import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { SystemPrisma } from '../database/system-prisma.service.js';
import { QUEUE_DRIVER, type QueueDriver } from '../ports/index.js';

@Injectable()
export class PerCompanyScheduler {
  private readonly logger = new Logger(PerCompanyScheduler.name);

  constructor(
    @Inject(QUEUE_DRIVER) private readonly queueDriver: QueueDriver,
    @Optional() private readonly systemPrisma?: SystemPrisma,
  ) {}

  /**
   * Retrieves all active company IDs across tenants using SystemPrisma (ARCH-SYSTEM-SCOPE).
   */
  async getActiveCompanyIds(): Promise<string[]> {
    if (!this.systemPrisma) {
      return [];
    }

    return this.systemPrisma.executeWithReason(
      '// SYSTEM-SCOPE: Fetch active company IDs for scheduled job fan-out',
      async (client) => {
        try {
          const rows = await client.$queryRawUnsafe<Array<{ id: string }>>(
            `SELECT id FROM companies WHERE is_active = true`,
          );
          return rows.map((r) => r.id);
        } catch {
          // Table may not yet exist in early migrations (pre-A0.8)
          return [];
        }
      },
    );
  }

  /**
   * Fans out one job per specified company into the target queue.
   */
  async fanOutToCompanies(
    companyIds: string[],
    queueName: string,
    payload: Record<string, unknown> = {},
  ): Promise<string[]> {
    const jobIds: string[] = [];

    for (const companyId of companyIds) {
      const jobId = await this.queueDriver.enqueue(queueName, {
        ...payload,
        companyId,
      });
      jobIds.push(jobId);
    }

    this.logger.log(
      `Fanned out ${jobIds.length} jobs to queue "${queueName}" across ${companyIds.length} companies`,
    );

    return jobIds;
  }

  /**
   * Discovers all active companies and fans out a job to each of them.
   */
  async scheduleForActiveCompanies(
    queueName: string,
    payload: Record<string, unknown> = {},
  ): Promise<string[]> {
    const companyIds = await this.getActiveCompanyIds();
    return this.fanOutToCompanies(companyIds, queueName, payload);
  }
}
