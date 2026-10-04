import { Injectable, Logger, Optional } from '@nestjs/common';
import { getTodayBusinessDate } from '@exzaestate/shared';
import { TenantDb } from '../../database/tenant-db.service.js';
import { PerCompanyScheduler } from '../../jobs/per-company.scheduler.js';
import { QUEUE_NAMES } from '../../jobs/queues.js';
import { OutboxService } from '../../platform/outbox/outbox.service.js';
import { NotificationService } from '../notifications/notification.service.js';
import { CRM_EVENTS } from './crm.events.js';

export interface CompanyOverdueResult {
  companyId: string;
  overdueCount: number;
  notifiedCount: number;
}

@Injectable()
export class OverdueFollowUpService {
  private readonly logger = new Logger(OverdueFollowUpService.name);

  constructor(
    private readonly tenantDb: TenantDb,
    private readonly notificationService: NotificationService,
    @Optional() private readonly outboxService?: OutboxService,
    @Optional() private readonly perCompanyScheduler?: PerCompanyScheduler,
  ) {}

  /**
   * Computes overdue follow-ups in the company's timezone (default Asia/Dhaka per architecture.md §11)
   * and delivers in-app notifications to each assignee inside the tenant transaction.
   */
  async processCompanyOverdue(companyId: string): Promise<CompanyOverdueResult> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const company = await tx.company.findUnique({
        where: { id: companyId },
        select: { timezone: true },
      });

      const timezone = company?.timezone || 'Asia/Dhaka';
      const todayStr = getTodayBusinessDate(timezone);
      const todayDate = new Date(`${todayStr}T00:00:00.000Z`);

      const overdueItems = await tx.followUp.findMany({
        where: {
          companyId,
          status: 'PENDING',
          dueDate: { lt: todayDate },
          deletedAt: null,
        },
        include: {
          lead: {
            select: { id: true, name: true },
          },
        },
      });

      let notifiedCount = 0;

      for (const item of overdueItems) {
        const dueDateFormatted = item.dueDate.toISOString().slice(0, 10);
        const leadName = item.lead?.name || 'Lead';

        try {
          await this.notificationService.notify(
            tx,
            'followup.overdue',
            [item.assignedToId],
            {
              leadName,
              followUpType: item.type,
              dueDate: dueDateFormatted,
              followUpId: item.id,
              leadId: item.leadId,
              companyId,
            },
            companyId,
          );
          notifiedCount++;
        } catch (err) {
          this.logger.warn(
            `Failed to send overdue notification for follow-up ${item.id}: ${(err as Error).message}`,
          );
        }

        if (this.outboxService) {
          await this.outboxService.emit(tx, CRM_EVENTS.FOLLOW_UP_OVERDUE, {
            followUpId: item.id,
            companyId,
            leadId: item.leadId,
            leadName,
            type: item.type,
            dueDate: dueDateFormatted,
            assignedToId: item.assignedToId,
          });
        }
      }

      this.logger.log(
        `Processed ${overdueItems.length} overdue follow-ups for company ${companyId} (timezone: ${timezone}, today: ${todayStr})`,
      );

      return {
        companyId,
        overdueCount: overdueItems.length,
        notifiedCount,
      };
    });
  }

  /**
   * Fans out the nightly overdue calculation job across all active companies.
   */
  async fanOutNightlyOverdueCheck(): Promise<string[]> {
    if (!this.perCompanyScheduler) {
      this.logger.warn('PerCompanyScheduler is not available for fan-out');
      return [];
    }

    return this.perCompanyScheduler.scheduleForActiveCompanies(QUEUE_NAMES.OVERDUE_CALCULATION, {
      task: 'FOLLOW_UP_OVERDUE',
    });
  }
}
