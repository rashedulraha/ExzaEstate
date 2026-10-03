import { Injectable } from '@nestjs/common';
import type { Prisma, SecurityEvent } from '@prisma/client';
import { TenantDb } from '../../database/tenant-db.service.js';

export interface CreateSecurityEventDto {
  companyId: string;
  userId?: string | null;
  eventType: string;
  severity?: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

@Injectable()
export class SecurityEventsService {
  constructor(private readonly tenantDb: TenantDb) {}

  /**
   * Records a security-relevant event into the insert-only security_events table.
   * Separate from audit_logs (RULE-IMMUTABLE).
   */
  async record(
    dto: CreateSecurityEventDto,
    externalTx?: Prisma.TransactionClient,
  ): Promise<SecurityEvent> {
    const data = {
      companyId: dto.companyId,
      userId: dto.userId ?? null,
      eventType: dto.eventType,
      severity: dto.severity ?? 'INFO',
      details: (dto.details ?? undefined) as Prisma.InputJsonValue | undefined,
      ipAddress: dto.ipAddress ?? null,
      userAgent: dto.userAgent ?? null,
      requestId: dto.requestId ?? null,
    };

    if (externalTx) {
      return (
        externalTx as unknown as {
          securityEvent: {
            create: (args: { data: typeof data }) => Promise<SecurityEvent>;
          };
        }
      ).securityEvent.create({ data });
    }

    return this.tenantDb.withCompany(dto.companyId, async (tx) => {
      return tx.securityEvent.create({ data });
    });
  }
}
