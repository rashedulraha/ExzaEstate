import { ForbiddenException, UnauthorizedException, type Logger } from '@nestjs/common';
import type { TenantDb } from '../../database/tenant-db.service.js';
import type { JwtAccessTokenPayload } from '../../modules/auth/token.service.js';

interface CacheStoreLike {
  get(key: string): Promise<unknown>;
}

export async function verifySystemSessionRevocation(
  tenantDb: TenantDb,
  payload: JwtAccessTokenPayload,
): Promise<void> {
  const sysRows = await tenantDb.rawPrisma.$queryRawUnsafe<
    Array<{ status: string; expires_at: Date }>
  >(
    `SELECT sa.status, ss.expires_at
     FROM system_sessions ss
     JOIN system_admins sa ON sa.id = ss.admin_id
     WHERE ss.id = $1::uuid AND sa.id = $2::uuid
     LIMIT 1`,
    payload.sid,
    payload.sub,
  );

  const sysRecord = sysRows[0];
  if (!sysRecord || new Date(sysRecord.expires_at) < new Date()) {
    throw new UnauthorizedException('Session is invalid or has expired');
  }
  if (sysRecord.status !== 'ACTIVE') {
    throw new UnauthorizedException('Super admin account is not active');
  }
}

async function checkRedisCacheRevocation(
  cacheStore: CacheStoreLike,
  payload: JwtAccessTokenPayload,
  logger?: Logger,
): Promise<void> {
  try {
    const revoked = await cacheStore.get(`session-revoked:${payload.companyId}:${payload.sid}`);
    if (revoked === '1' || (revoked as unknown) === 1) {
      throw new UnauthorizedException('Session has been revoked');
    }
  } catch (err) {
    if (err instanceof UnauthorizedException) throw err;
    logger?.warn(`Redis session check failed, falling back to database: ${String(err)}`);
  }
}

function assertTenantSessionActive(sessionRecord?: {
  revoked_at: Date | null;
  status: string;
  company_active: boolean;
}): void {
  if (!sessionRecord || sessionRecord.revoked_at !== null) {
    throw new UnauthorizedException('Session is invalid or has been revoked');
  }
  if (sessionRecord.status !== 'ACTIVE') {
    throw new UnauthorizedException('User account is not active');
  }
  if (!sessionRecord.company_active) {
    throw new ForbiddenException('Tenant company is suspended');
  }
}

export async function verifyTenantSessionRevocation(
  tenantDb: TenantDb,
  payload: JwtAccessTokenPayload,
  cacheStore?: CacheStoreLike | null,
  logger?: Logger,
): Promise<void> {
  if (cacheStore) {
    await checkRedisCacheRevocation(cacheStore, payload, logger);
  }

  const sessionRows = await tenantDb.withCompany(payload.companyId, async (tx) => {
    return tx.$queryRawUnsafe<
      Array<{ revoked_at: Date | null; status: string; company_active: boolean }>
    >(
      `SELECT s.revoked_at, u.status, c.is_active as company_active
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       JOIN companies c ON c.id = s.company_id
       WHERE s.id = $1::uuid AND s.company_id = $2::uuid
       LIMIT 1`,
      payload.sid,
      payload.companyId,
    );
  });

  assertTenantSessionActive(sessionRows[0]);
}
