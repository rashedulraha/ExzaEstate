import { Injectable } from '@nestjs/common';
import { RequestContext } from '../../common/context/request-context.service.js';
import type { TenantPrisma } from '../../database/tenant-prisma.js';
import {
  IdempotencyKeyReusedException,
  RequestInProgressException,
} from './idempotency.exceptions.js';

export interface IdempotencyBeginParams {
  key: string;
  requestHash: string;
  method: string;
  routePattern: string;
  userId?: string;
  expiresInHours?: number;
  lockTimeoutMs?: number;
}

export interface IdempotencyBeginResult {
  replayed: boolean;
  status?: number;
  body?: unknown;
  keyId?: string;
}

export interface IdempotencyCompleteParams {
  key: string;
  method: string;
  routePattern: string;
  status: number;
  body: unknown;
  userId?: string;
}

interface StoredIdempotencyRow {
  request_hash: string;
  response_status: number | null;
  response_body: unknown;
  expires_at: Date;
}

@Injectable()
export class IdempotencyService {
  constructor(private readonly requestContext: RequestContext) {}

  /**
   * Begins idempotency processing inside the caller's transaction.
   *
   * Enforces ARCH-IDEMPOTENCY (§6.1, D-07):
   * 1. Sets transaction-local lock_timeout (default 5s).
   * 2. Tries to insert the key row in the business transaction.
   * 3. Blocks concurrent requests on unique index until this transaction commits/rolls back.
   * 4. Returns stored response if identical completed request already ran;
   *    throws IDEMPOTENCY_KEY_REUSED (422) if hash differs;
   *    throws REQUEST_IN_PROGRESS (409) if blocked > lock_timeout.
   */
  async begin(tx: TenantPrisma, params: IdempotencyBeginParams): Promise<IdempotencyBeginResult> {
    const companyId = tx.currentCompanyId;
    const userId = params.userId ?? this.requestContext.userId;
    if (!userId) {
      throw new Error('Idempotency requires an authenticated userId');
    }

    const lockTimeoutMs = params.lockTimeoutMs ?? 5000;
    const expiresInHours = params.expiresInHours ?? 24;

    await tx.$executeRawUnsafe(`SET LOCAL lock_timeout = '${lockTimeoutMs}ms'`);

    const insertedId = await this.tryInsertKey(tx, companyId, userId, params, expiresInHours);
    if (insertedId) {
      return { replayed: false, keyId: insertedId };
    }

    return this.resolveExistingKey(tx, companyId, userId, params);
  }

  private async tryInsertKey(
    tx: TenantPrisma,
    companyId: string,
    userId: string,
    params: IdempotencyBeginParams,
    expiresInHours: number,
  ): Promise<string | null> {
    try {
      const id = crypto.randomUUID();
      const insertRows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `
        INSERT INTO idempotency_keys (
          id,
          company_id,
          user_id,
          method,
          route_pattern,
          key,
          request_hash,
          expires_at
        ) VALUES (
          $1::uuid,
          $2::uuid,
          $3::uuid,
          $4,
          $5,
          $6,
          $7,
          now() + ($8 || ' hours')::interval
        )
        ON CONFLICT (company_id, user_id, method, route_pattern, key)
        DO NOTHING
        RETURNING id;
      `,
        id,
        companyId,
        userId,
        params.method,
        params.routePattern,
        params.key,
        params.requestHash,
        String(expiresInHours),
      );

      return insertRows[0]?.id ?? null;
    } catch (err: unknown) {
      const pgErr = err as { code?: string; message?: string };
      if (pgErr.code === '55P03' || pgErr.message?.includes('lock timeout')) {
        throw new RequestInProgressException();
      }
      throw err;
    }
  }

  private async resolveExistingKey(
    tx: TenantPrisma,
    companyId: string,
    userId: string,
    params: IdempotencyBeginParams,
  ): Promise<IdempotencyBeginResult> {
    const existingRows = await tx.$queryRawUnsafe<Array<StoredIdempotencyRow>>(
      `
      SELECT
        request_hash,
        response_status,
        response_body,
        expires_at
      FROM idempotency_keys
      WHERE company_id = $1::uuid
        AND user_id = $2::uuid
        AND method = $3
        AND route_pattern = $4
        AND key = $5
    `,
      companyId,
      userId,
      params.method,
      params.routePattern,
      params.key,
    );

    const existing = existingRows[0];
    if (!existing) {
      return this.begin(tx, params);
    }

    if (existing.request_hash !== params.requestHash) {
      throw new IdempotencyKeyReusedException(
        'Idempotency key reused with different request payload',
        { key: params.key },
      );
    }

    if (existing.response_status === null) {
      throw new RequestInProgressException();
    }

    return {
      replayed: true,
      status: existing.response_status,
      body: existing.response_body,
    };
  }

  /**
   * Completes the idempotency record by persisting the HTTP status code and response payload.
   *
   * Commits atomically with the business transaction.
   */
  async complete(tx: TenantPrisma, params: IdempotencyCompleteParams): Promise<void> {
    const companyId = tx.currentCompanyId;
    const userId = params.userId ?? this.requestContext.userId;
    if (!userId) {
      throw new Error('Idempotency requires an authenticated userId');
    }

    await tx.$executeRawUnsafe(
      `
      UPDATE idempotency_keys
      SET
        response_status = $1,
        response_body = $2::jsonb
      WHERE company_id = $3::uuid
        AND user_id = $4::uuid
        AND method = $5
        AND route_pattern = $6
        AND key = $7
    `,
      params.status,
      params.body ? JSON.stringify(params.body) : null,
      companyId,
      userId,
      params.method,
      params.routePattern,
      params.key,
    );
  }
}
