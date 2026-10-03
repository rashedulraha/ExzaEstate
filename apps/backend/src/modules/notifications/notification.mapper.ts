import type { InAppNotification } from '@prisma/client';
import type { InAppNotificationResponseDto } from './dto/in-app-notification-response.dto.js';

export interface CursorPayload {
  offset: number;
}

export class NotificationMapper {
  static toInAppDto(record: InAppNotification): InAppNotificationResponseDto {
    return {
      id: record.id,
      companyId: record.companyId,
      userId: record.userId,
      eventCode: record.eventCode,
      title: record.title,
      body: record.body,
      data: (record.data as Record<string, unknown> | null) ?? null,
      isRead: record.isRead,
      readAt: record.readAt ? record.readAt.toISOString() : null,
      createdAt: record.createdAt.toISOString(),
    };
  }

  static encodeCursor(offset: number): string {
    const payload: CursorPayload = { offset };
    return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  }

  static decodeCursor(cursor?: string): CursorPayload | null {
    if (!cursor) return null;
    try {
      const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
      const parsed = JSON.parse(decoded) as { offset?: unknown };
      if (typeof parsed.offset === 'number' && parsed.offset >= 0) {
        return { offset: parsed.offset };
      }
      return null;
    } catch {
      return null;
    }
  }
}
