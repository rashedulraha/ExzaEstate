import type { AuditLog, SecurityEvent } from '@prisma/client';
import type { AuditLogResponseDto, SecurityEventResponseDto } from './dto/index.js';

export interface CursorPayload {
  offset: number;
}

export class AuditMapper {
  static toAuditLogDto(log: AuditLog): AuditLogResponseDto {
    return {
      id: log.id,
      companyId: log.companyId,
      actorId: log.actorId,
      module: log.module,
      recordType: log.recordType,
      recordId: log.recordId,
      action: log.action,
      oldValue: (log.oldValue as Record<string, unknown> | null) ?? null,
      newValue: (log.newValue as Record<string, unknown> | null) ?? null,
      reason: log.reason,
      ipAddress: log.ipAddress,
      requestId: log.requestId,
      createdAt: log.createdAt.toISOString(),
    };
  }

  static toSecurityEventDto(event: SecurityEvent): SecurityEventResponseDto {
    return {
      id: event.id,
      companyId: event.companyId,
      userId: event.userId,
      eventType: event.eventType,
      severity: event.severity,
      details: (event.details as Record<string, unknown> | null) ?? null,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      requestId: event.requestId,
      createdAt: event.createdAt.toISOString(),
    };
  }

  static encodeCursor(offset: number): string {
    const payload: CursorPayload = { offset };
    return Buffer.from(JSON.stringify(payload)).toString('base64url');
  }

  static decodeCursor(cursor?: string): CursorPayload | null {
    if (!cursor) return null;
    try {
      const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
      const parsed = JSON.parse(decoded) as Partial<CursorPayload>;
      if (typeof parsed.offset === 'number') {
        return { offset: parsed.offset };
      }
      return null;
    } catch {
      return null;
    }
  }

  static escapeCsvValue(val: unknown): string {
    if (val === null || val === undefined) return '';
    let str: string;
    if (typeof val === 'object') {
      str = JSON.stringify(val);
    } else {
      str = String(val);
    }
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }
}
