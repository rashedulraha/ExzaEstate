import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { TenantDb } from '../../../database/tenant-db.service.js';
import {
  EMAIL_PROVIDER,
  SMS_PROVIDER,
  type EmailProvider,
  type SmsProvider,
} from '../../../ports/index.js';

export interface DispatchMetadata {
  recipientId?: string | null;
  templateId?: string | null;
  payload?: Record<string, unknown>;
}

export interface DispatchResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class NotificationDeliveryService {
  private readonly logger = new Logger(NotificationDeliveryService.name);

  constructor(
    private readonly tenantDb: TenantDb,
    @Optional() @Inject(SMS_PROVIDER) private readonly smsProvider?: SmsProvider,
    @Optional() @Inject(EMAIL_PROVIDER) private readonly emailProvider?: EmailProvider,
  ) {}

  async dispatchSms(
    companyId: string,
    recipientPhone: string,
    body: string,
    metadata?: DispatchMetadata,
  ): Promise<DispatchResult> {
    if (!this.smsProvider) {
      this.logger.warn(`SmsProvider port not available; skipping SMS to ${recipientPhone}`);
      return { success: false, error: 'SMS provider not configured' };
    }

    try {
      const sendResult = await this.smsProvider.send({
        to: recipientPhone,
        body,
      });

      const isSuccess = sendResult.status === 'SENT';

      await this.tenantDb.withCompany(companyId, async (tx) => {
        await tx.notificationLog.create({
          data: {
            companyId,
            recipientId: metadata?.recipientId ?? null,
            templateId: metadata?.templateId ?? null,
            channel: 'SMS',
            status: isSuccess ? 'SENT' : 'FAILED',
            payload: (metadata?.payload ?? { to: recipientPhone, body }) as Prisma.InputJsonValue,
            sentAt: isSuccess ? new Date() : null,
          },
        });
      });

      return {
        success: isSuccess,
        messageId: sendResult.messageId,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to dispatch SMS: ${errorMsg}`);

      await this.tenantDb.withCompany(companyId, async (tx) => {
        await tx.notificationLog.create({
          data: {
            companyId,
            recipientId: metadata?.recipientId ?? null,
            templateId: metadata?.templateId ?? null,
            channel: 'SMS',
            status: 'FAILED',
            error: errorMsg,
            payload: (metadata?.payload ?? { to: recipientPhone, body }) as Prisma.InputJsonValue,
          },
        });
      });

      return { success: false, error: errorMsg };
    }
  }

  async dispatchEmail(
    companyId: string,
    to: string,
    subject: string,
    html: string,
    text?: string,
    metadata?: DispatchMetadata,
  ): Promise<DispatchResult> {
    if (!this.emailProvider) {
      this.logger.warn(`EmailProvider port not available; skipping email to ${to}`);
      return { success: false, error: 'Email provider not configured' };
    }

    try {
      const sendResult = await this.emailProvider.send({
        to,
        subject,
        html,
        text: text ?? html,
      });

      const isSuccess = sendResult.status === 'SENT';

      await this.tenantDb.withCompany(companyId, async (tx) => {
        await tx.notificationLog.create({
          data: {
            companyId,
            recipientId: metadata?.recipientId ?? null,
            templateId: metadata?.templateId ?? null,
            channel: 'EMAIL',
            status: isSuccess ? 'SENT' : 'FAILED',
            payload: (metadata?.payload ?? { to, subject }) as Prisma.InputJsonValue,
            sentAt: isSuccess ? new Date() : null,
          },
        });
      });

      return {
        success: isSuccess,
        messageId: sendResult.messageId,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to dispatch Email: ${errorMsg}`);

      await this.tenantDb.withCompany(companyId, async (tx) => {
        await tx.notificationLog.create({
          data: {
            companyId,
            recipientId: metadata?.recipientId ?? null,
            templateId: metadata?.templateId ?? null,
            channel: 'EMAIL',
            status: 'FAILED',
            error: errorMsg,
            payload: (metadata?.payload ?? { to, subject }) as Prisma.InputJsonValue,
          },
        });
      });

      return { success: false, error: errorMsg };
    }
  }
}
