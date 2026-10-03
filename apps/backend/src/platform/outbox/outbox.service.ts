import { Injectable } from '@nestjs/common';
import type { TenantPrisma } from '../../database/tenant-prisma.js';

export interface OutboxEventRecord {
  id: string;
  companyId: string;
  eventName: string;
  payload: Record<string, unknown>;
  status: string;
  attempts: number;
  createdAt: Date;
  processedAt: Date | null;
}

@Injectable()
export class OutboxService {
  /**
   * Emits a domain event into the transactional outbox table inside the caller's transaction.
   *
   * Enforces RULE-ATOMIC: if the transaction commits, the event is guaranteed to be enqueued;
   * if the transaction rolls back, the event disappears without side-effects.
   */
  async emit(
    tx: TenantPrisma,
    eventName: string,
    payload: Record<string, unknown>,
  ): Promise<OutboxEventRecord> {
    const id = crypto.randomUUID();
    const companyId = tx.currentCompanyId;

    const rows = await tx.$queryRawUnsafe<
      Array<{
        id: string;
        companyId: string;
        eventName: string;
        payload: Record<string, unknown>;
        status: string;
        attempts: number;
        createdAt: Date;
        processedAt: Date | null;
      }>
    >(
      `
      INSERT INTO outbox_events (
        id,
        company_id,
        event_name,
        payload,
        status,
        attempts,
        created_at
      ) VALUES (
        $1::uuid,
        $2::uuid,
        $3,
        $4::jsonb,
        'PENDING',
        0,
        now()
      )
      RETURNING
        id,
        company_id as "companyId",
        event_name as "eventName",
        payload,
        status,
        attempts,
        created_at as "createdAt",
        processed_at as "processedAt"
    `,
      id,
      companyId,
      eventName,
      JSON.stringify(payload),
    );

    const record = rows[0];
    if (!record) {
      throw new Error('Failed to insert outbox event');
    }

    return record;
  }
}
