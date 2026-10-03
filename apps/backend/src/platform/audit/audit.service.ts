import { Injectable } from '@nestjs/common';
import { RequestContext } from '../../common/context/request-context.service.js';
import type { TenantPrisma } from '../../database/tenant-prisma.js';

export interface AuditRecordParams {
  action: string;
  module?: string;
  recordType?: string;
  recordId?: string;
  entity?: string;
  entityId?: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  reason?: string | null;
  ipAddress?: string | null;
  requestId?: string;
}

interface ResolvedAuditPayload {
  moduleName: string;
  recordType: string;
  recordId: string;
  oldValue: string | null;
  newValue: string | null;
  reason: string | null;
}

function stringifyOrNull(val?: Record<string, unknown> | null): string | null {
  return val ? JSON.stringify(val) : null;
}

function resolveAuditPayload(params: AuditRecordParams): ResolvedAuditPayload {
  const recordId = params.recordId || params.entityId;
  if (!recordId) {
    throw new Error('AuditService.record requires recordId or entityId');
  }

  const rawOld = params.oldValue || params.before;
  const rawNew = params.newValue || params.after;

  return {
    moduleName: params.module || params.entity || 'general',
    recordType: params.recordType || params.entity || 'Unknown',
    recordId,
    oldValue: stringifyOrNull(rawOld),
    newValue: stringifyOrNull(rawNew),
    reason: params.reason || null,
  };
}

@Injectable()
export class AuditService {
  constructor(private readonly requestContext: RequestContext) {}

  /**
   * Synchronously records an append-only audit trail record inside the caller's transaction.
   *
   * Enforces RULE-ATOMIC: runs in the same transaction as the business operation.
   * Enforces AT-32: if this audit write fails, the entire transaction rolls back.
   * Enforces RULE-IMMUTABLE: audit_logs cannot be modified or deleted.
   */
  async record(tx: TenantPrisma, params: AuditRecordParams): Promise<void> {
    const payload = resolveAuditPayload(params);
    const companyId = tx.currentCompanyId;
    const actorId = this.requestContext.userId || null;
    const requestId = params.requestId || this.requestContext.requestId || crypto.randomUUID();
    const ipAddress = params.ipAddress || null;

    // Use parameterized query with explicit UUID casting so invalid IDs fail closed at DB level
    await tx.$executeRawUnsafe(
      `
      INSERT INTO audit_logs (
        company_id,
        actor_id,
        module,
        record_type,
        record_id,
        action,
        old_value,
        new_value,
        reason,
        ip_address,
        request_id,
        created_at
      ) VALUES (
        $1::uuid,
        $2::uuid,
        $3,
        $4,
        $5::uuid,
        $6,
        $7::jsonb,
        $8::jsonb,
        $9,
        $10,
        $11,
        now()
      )
    `,
      companyId,
      actorId,
      payload.moduleName,
      payload.recordType,
      payload.recordId,
      params.action,
      payload.oldValue,
      payload.newValue,
      payload.reason,
      ipAddress,
      requestId,
    );
  }
}
