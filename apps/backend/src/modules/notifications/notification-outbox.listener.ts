import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DOMAIN_EVENTS } from '@exzaestate/shared';
import { TenantDb } from '../../database/tenant-db.service.js';
import { OutboxDispatcher } from '../../platform/outbox/outbox.dispatcher.js';
import type { OutboxEventRecord } from '../../platform/outbox/outbox.service.js';
import { NotificationService } from './notification.service.js';

@Injectable()
export class NotificationOutboxListener implements OnModuleInit {
  private readonly logger = new Logger(NotificationOutboxListener.name);

  constructor(
    private readonly outboxDispatcher: OutboxDispatcher,
    private readonly notificationService: NotificationService,
    private readonly tenantDb: TenantDb,
  ) {}

  onModuleInit(): void {
    const eventsToRegister = [
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
      'document.expiry_alert',
    ];

    for (const eventName of eventsToRegister) {
      this.outboxDispatcher.registerHandler(eventName, async (event, ctx) => {
        await this.handleOutboxEvent(event, ctx);
      });
    }

    this.logger.log(
      `NotificationOutboxListener registered for ${eventsToRegister.length} domain events`,
    );
  }

  /**
   * Resolves recipient user IDs from the outbox event payload.
   */
  private resolveRecipients(payload: Record<string, unknown>): string[] {
    if (Array.isArray(payload['recipients'])) {
      return payload['recipients'].filter(
        (r): r is string => typeof r === 'string' && r.length > 0,
      );
    }

    const singleRecipient = payload['recipientId'] ?? payload['userId'];
    if (typeof singleRecipient === 'string' && singleRecipient.length > 0) {
      return [singleRecipient];
    }

    return [];
  }

  /**
   * Processes an outbox domain event by rendering templates and writing in-app notifications.
   */
  async handleOutboxEvent(event: OutboxEventRecord, ctx: { companyId: string }): Promise<void> {
    const payload = (event.payload ?? {}) as Record<string, unknown>;
    const recipients = this.resolveRecipients(payload);

    if (recipients.length === 0) {
      this.logger.debug(
        `Outbox event ${event.id} (${event.eventName}) has no recipients; skipping notification`,
      );
      return;
    }

    await this.tenantDb.withCompany(ctx.companyId, async (tx) => {
      const result = await this.notificationService.notify(
        tx,
        event.eventName,
        recipients,
        payload,
        ctx.companyId,
      );

      this.logger.debug(
        `Rendered notification for event ${event.eventName}: delivered=${result.deliveredCount}, skipped=${result.skippedCount}`,
      );
    });
  }
}
