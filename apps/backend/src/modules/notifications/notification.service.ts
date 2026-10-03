import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { TenantDb } from '../../database/tenant-db.service.js';
import type { TenantPrisma } from '../../database/tenant-prisma.js';
import {
  DEFAULT_NOTIFICATION_TEMPLATES,
  type DefaultTemplateDefinition,
} from '../../platform/tenant-provisioning/steps/default-templates.data.js';
import type {
  InAppNotificationResponseDto,
  NotificationPreferenceResponseDto,
  QueryInboxDto,
  UnreadCountResponseDto,
  UpdatePreferencesDto,
} from './dto/index.js';
import { NotificationMapper } from './notification.mapper.js';
import { TemplateRenderer } from './template-renderer.js';

export interface NotifyResult {
  deliveredCount: number;
  skippedCount: number;
}

interface ResolvedTemplate {
  id?: string;
  title: string;
  body: string;
}

type NotificationTx = TenantPrisma | Prisma.TransactionClient;

@Injectable()
export class NotificationService {
  constructor(private readonly tenantDb: TenantDb) {}

  private resolveTemplateFallback(event: string): DefaultTemplateDefinition {
    const defaultTpl = DEFAULT_NOTIFICATION_TEMPLATES.find(
      (t) => t.eventCode === event && t.channel === 'IN_APP',
    );
    if (defaultTpl) {
      return defaultTpl;
    }
    return {
      eventCode: event,
      channel: 'IN_APP',
      title: event,
      body: 'Notification for event {{event}}',
    };
  }

  private async resolveTemplate(
    tx: NotificationTx,
    companyId: string,
    event: string,
  ): Promise<ResolvedTemplate> {
    const customTemplate = await tx.notificationTemplate.findUnique({
      where: {
        companyId_eventCode_channel: {
          companyId,
          eventCode: event,
          channel: 'IN_APP',
        },
      },
    });

    if (customTemplate && customTemplate.isActive) {
      return {
        id: customTemplate.id,
        title: customTemplate.title,
        body: customTemplate.body,
      };
    }

    const fallback = this.resolveTemplateFallback(event);
    return {
      title: fallback.title,
      body: fallback.body,
    };
  }

  /**
   * Dispatches notifications to recipients inside the caller's transaction.
   */
  async notify(
    tx: NotificationTx,
    event: string,
    recipients: string[],
    payload: Record<string, unknown> = {},
    companyIdParam?: string,
  ): Promise<NotifyResult> {
    if (recipients.length === 0) {
      return { deliveredCount: 0, skippedCount: 0 };
    }

    const companyId =
      companyIdParam ||
      (typeof payload['companyId'] === 'string' ? payload['companyId'] : undefined);

    if (!companyId) {
      throw new Error('companyId is required for NotificationService.notify');
    }

    const tpl = await this.resolveTemplate(tx, companyId, event);
    const renderContext = { ...payload, event };
    const renderedTitle = TemplateRenderer.render(tpl.title, renderContext);
    const renderedBody = TemplateRenderer.render(tpl.body, renderContext);

    const preferences = await tx.notificationPreference.findMany({
      where: {
        companyId,
        userId: { in: recipients },
        eventCode: event,
        channel: 'IN_APP',
      },
    });

    const disabledUserIds = new Set(preferences.filter((p) => !p.enabled).map((p) => p.userId));

    let deliveredCount = 0;
    let skippedCount = 0;

    for (const userId of recipients) {
      if (disabledUserIds.has(userId)) {
        skippedCount++;
        continue;
      }

      await tx.inAppNotification.create({
        data: {
          companyId,
          userId,
          eventCode: event,
          title: renderedTitle,
          body: renderedBody,
          data: payload as Prisma.InputJsonValue,
        },
      });

      await tx.notificationLog.create({
        data: {
          companyId,
          recipientId: userId,
          templateId: tpl.id ?? null,
          channel: 'IN_APP',
          status: 'SENT',
          payload: payload as Prisma.InputJsonValue,
        },
      });

      deliveredCount++;
    }

    return { deliveredCount, skippedCount };
  }

  async queryInbox(
    companyId: string,
    userId: string,
    query: QueryInboxDto,
  ): Promise<{
    items: InAppNotificationResponseDto[];
    nextCursor: string | null;
    hasMore: boolean;
  }> {
    const limit = query.limit ?? 20;
    const cursor = NotificationMapper.decodeCursor(query.cursor);
    const skip = cursor ? cursor.offset : 0;

    const where: Prisma.InAppNotificationWhereInput = {
      companyId,
      userId,
      ...(query.isRead !== undefined && { isRead: query.isRead }),
    };

    const rows = await this.tenantDb.withCompany(companyId, (tx) =>
      tx.inAppNotification.findMany({
        where,
        skip,
        take: limit + 1,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    );

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? NotificationMapper.encodeCursor(skip + limit) : null;

    return {
      items: items.map(NotificationMapper.toInAppDto),
      nextCursor,
      hasMore,
    };
  }

  async getUnreadCount(companyId: string, userId: string): Promise<UnreadCountResponseDto> {
    const count = await this.tenantDb.withCompany(companyId, (tx) =>
      tx.inAppNotification.count({
        where: {
          companyId,
          userId,
          isRead: false,
        },
      }),
    );

    return { count };
  }

  async markAsRead(
    companyId: string,
    userId: string,
    notificationId: string,
  ): Promise<InAppNotificationResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const existing = await tx.inAppNotification.findFirst({
        where: { id: notificationId, companyId, userId },
      });

      if (!existing) {
        throw new NotFoundException(`Notification with ID ${notificationId} not found`);
      }

      const updated = await tx.inAppNotification.update({
        where: { id: notificationId },
        data: { isRead: true, readAt: new Date() },
      });

      return NotificationMapper.toInAppDto(updated);
    });
  }

  async markAllAsRead(companyId: string, userId: string): Promise<{ updatedCount: number }> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const res = await tx.inAppNotification.updateMany({
        where: { companyId, userId, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });

      return { updatedCount: res.count };
    });
  }

  private async fetchPreferences(
    tx: NotificationTx,
    companyId: string,
    userId: string,
  ): Promise<NotificationPreferenceResponseDto[]> {
    const catalog = await tx.notificationEventCatalog.findMany({
      orderBy: { code: 'asc' },
    });

    const userPreferences = await tx.notificationPreference.findMany({
      where: { companyId, userId },
    });

    const prefMap = new Map<string, boolean>();
    for (const pref of userPreferences) {
      prefMap.set(`${pref.eventCode}:${pref.channel}`, pref.enabled);
    }

    return catalog.map((event) => {
      const key = `${event.code}:IN_APP`;
      const enabled = prefMap.has(key) ? (prefMap.get(key) ?? true) : true;
      return {
        eventCode: event.code,
        eventName: event.name,
        module: event.module,
        channel: 'IN_APP',
        enabled,
      };
    });
  }

  async getPreferences(
    companyId: string,
    userId: string,
  ): Promise<NotificationPreferenceResponseDto[]> {
    return this.tenantDb.withCompany(companyId, (tx) =>
      this.fetchPreferences(tx, companyId, userId),
    );
  }

  async updatePreferences(
    companyId: string,
    userId: string,
    dto: UpdatePreferencesDto,
  ): Promise<NotificationPreferenceResponseDto[]> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      for (const item of dto.preferences) {
        await tx.notificationPreference.upsert({
          where: {
            companyId_userId_eventCode_channel: {
              companyId,
              userId,
              eventCode: item.eventCode,
              channel: item.channel,
            },
          },
          update: { enabled: item.enabled },
          create: {
            companyId,
            userId,
            eventCode: item.eventCode,
            channel: item.channel,
            enabled: item.enabled,
          },
        });
      }

      return this.fetchPreferences(tx, companyId, userId);
    });
  }
}
