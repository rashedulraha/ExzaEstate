import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { DOMAIN_EVENTS } from '@exzaestate/shared';
import { OutboxDispatcher } from '../../platform/outbox/outbox.dispatcher.js';
import type { OutboxEventRecord } from '../../platform/outbox/outbox.service.js';
import { RealtimeService } from './realtime.service.js';

@Injectable()
export class RealtimeOutboxListener implements OnModuleInit {
  private readonly logger = new Logger(RealtimeOutboxListener.name);

  constructor(
    private readonly realtimeService: RealtimeService,
    @Optional() private readonly outboxDispatcher?: OutboxDispatcher,
  ) {}

  onModuleInit(): void {
    if (!this.outboxDispatcher) {
      return;
    }

    const domainEvents = [
      DOMAIN_EVENTS.BOOKING_REQUESTED,
      DOMAIN_EVENTS.BOOKING_CONFIRMED,
      DOMAIN_EVENTS.BOOKING_CANCELLED,
      DOMAIN_EVENTS.INSTALLMENT_DUE,
      DOMAIN_EVENTS.INSTALLMENT_OVERDUE,
      DOMAIN_EVENTS.APPROVAL_REQUESTED,
      DOMAIN_EVENTS.APPROVAL_GRANTED,
      DOMAIN_EVENTS.APPROVAL_REJECTED,
      DOMAIN_EVENTS.PAYMENT_RECEIVED,
      DOMAIN_EVENTS.PAYMENT_POSTED,
      DOMAIN_EVENTS.PAYMENT_BOUNCED,
      DOMAIN_EVENTS.REFUND_REQUESTED,
      DOMAIN_EVENTS.LEAD_CREATED,
      DOMAIN_EVENTS.SECURITY_EVENT,
      'budget.threshold_reached',
      'expense.approved',
      'commission.earned',
    ];

    for (const eventName of domainEvents) {
      this.outboxDispatcher.registerHandler(eventName, async (record: OutboxEventRecord) => {
        await this.forwardOutboxEvent(record);
      });
    }

    this.logger.log(`RealtimeOutboxListener registered for ${domainEvents.length} events`);
  }

  async forwardOutboxEvent(record: OutboxEventRecord): Promise<void> {
    const payload = record.payload as Record<string, unknown>;
    const targetUserId =
      typeof payload['userId'] === 'string'
        ? payload['userId']
        : typeof payload['recipientId'] === 'string'
          ? payload['recipientId']
          : undefined;

    const requiredPermission =
      typeof payload['requiredPermission'] === 'string' ? payload['requiredPermission'] : undefined;

    await this.realtimeService.publish({
      id: record.id,
      eventName: record.eventName,
      companyId: record.companyId,
      userId: targetUserId,
      requiredPermission,
      payload,
      timestamp: record.createdAt?.toISOString() ?? new Date().toISOString(),
    });
  }
}
