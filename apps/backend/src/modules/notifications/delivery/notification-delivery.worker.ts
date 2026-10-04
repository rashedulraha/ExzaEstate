import { Injectable, Logger } from '@nestjs/common';
import { NotificationDeliveryService } from './notification-delivery.service.js';

export interface NotificationDeliveryJob {
  companyId: string;
  channel: 'SMS' | 'EMAIL';
  destination: string;
  subject?: string;
  body: string;
  html?: string;
  recipientId?: string;
  templateId?: string;
  payload?: Record<string, unknown>;
  attempts?: number;
  maxAttempts?: number;
}

@Injectable()
export class NotificationDeliveryWorker {
  private readonly logger = new Logger(NotificationDeliveryWorker.name);

  constructor(private readonly deliveryService: NotificationDeliveryService) {}

  async process(job: NotificationDeliveryJob): Promise<boolean> {
    const attempts = job.attempts ?? 1;
    const maxAttempts = job.maxAttempts ?? 3;

    let result: { success: boolean; error?: string };

    if (job.channel === 'SMS') {
      result = await this.deliveryService.dispatchSms(
        job.companyId,
        job.destination,
        job.body,
        {
          recipientId: job.recipientId,
          templateId: job.templateId,
          payload: job.payload,
        },
      );
    } else {
      result = await this.deliveryService.dispatchEmail(
        job.companyId,
        job.destination,
        job.subject ?? 'Notification',
        job.html ?? job.body,
        job.body,
        {
          recipientId: job.recipientId,
          templateId: job.templateId,
          payload: job.payload,
        },
      );
    }

    if (!result.success && attempts < maxAttempts) {
      this.logger.warn(
        `Job failed on attempt ${attempts}/${maxAttempts}: ${result.error}. Will retry.`,
      );
      return false;
    }

    return result.success;
  }
}
