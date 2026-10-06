import crypto from 'node:crypto';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { UnauthorizedException } from '../../common/exceptions/app.exception.js';
import { ConfigService } from '../../config/config.service.js';
import { TenantDb } from '../../database/tenant-db.service.js';
import type { TenantPrisma } from '../../database/tenant-prisma.js';
import { CACHE_STORE, type CacheStore } from '../../ports/index.js';

export interface JwtAccessTokenPayload {
  sub: string;
  companyId: string;
  sid: string;
  realm?: string;
}

export interface SessionContext {
  userId: string;
  companyId: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface TokenPairResult {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly tenantDb: TenantDb,
    @Optional() @Inject(CACHE_STORE) private readonly cacheStore?: CacheStore,
  ) {}

  /**
   * Hashes a raw token with SHA-256 for persistent database storage.
   */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generates a signed JWT access token containing ONLY sub, companyId, and sid.
   */
  generateAccessToken(payload: JwtAccessTokenPayload): string {
    return jwt.sign(payload, this.configService.jwt.accessSecret, {
      expiresIn: this.configService.jwt.accessExpiresIn as jwt.SignOptions['expiresIn'],
    });
  }

  /**
   * Creates a new session and issues an access/refresh token pair.
   */
  async createSessionAndTokens(tx: TenantPrisma, ctx: SessionContext): Promise<TokenPairResult> {
    const sessionId = crypto.randomUUID();
    const familyId = crypto.randomUUID();
    const rawRefreshToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // 1. Insert session record
    await tx.$executeRawUnsafe(
      `INSERT INTO sessions (id, company_id, user_id, family_id, user_agent, ip_address, created_at, last_seen_at)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5, $6, now(), now())`,
      sessionId,
      ctx.companyId,
      ctx.userId,
      familyId,
      ctx.userAgent || null,
      ctx.ipAddress || null,
    );

    // 2. Insert hashed refresh token record
    await tx.$executeRawUnsafe(
      `INSERT INTO refresh_tokens (id, company_id, user_id, session_id, family_id, token_hash, expires_at, user_agent, ip_address, created_at)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $6, $7, $8, $9, now())`,
      crypto.randomUUID(),
      ctx.companyId,
      ctx.userId,
      sessionId,
      familyId,
      tokenHash,
      expiresAt,
      ctx.userAgent || null,
      ctx.ipAddress || null,
    );

    // 3. Update last login at
    await tx.$executeRawUnsafe(
      `UPDATE users SET last_login_at = now() WHERE id = $1::uuid`,
      ctx.userId,
    );

    // 4. Generate access token
    const accessToken = this.generateAccessToken({
      sub: ctx.userId,
      companyId: ctx.companyId,
      sid: sessionId,
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      sessionId,
    };
  }

  /**
   * Rotates a refresh token inside its family with strict reuse detection.
   */
  async rotateRefreshToken(
    tx: TenantPrisma,
    rawRefreshToken: string,
    opts: { userAgent?: string; ipAddress?: string } = {},
  ): Promise<TokenPairResult> {
    const tokenHash = this.hashToken(rawRefreshToken);

    const rows = await tx.$queryRawUnsafe<
      Array<{
        id: string;
        company_id: string;
        user_id: string;
        session_id: string;
        family_id: string;
        revoked_at: Date | null;
        expires_at: Date;
      }>
    >(
      `SELECT id, company_id, user_id, session_id, family_id, revoked_at, expires_at
       FROM refresh_tokens
       WHERE token_hash = $1
       LIMIT 1`,
      tokenHash,
    );

    const found = rows[0];
    if (!found) {
      throw new UnauthorizedException('Invalid or unknown refresh token');
    }

    // THEFT / REUSE DETECTION: If token is already revoked, revoke the entire family!
    if (found.revoked_at !== null) {
      this.logger.warn(
        `Refresh token reuse detected for family ${found.family_id} (user ${found.user_id}) from IP ${opts.ipAddress}`,
      );

      // Persist revocation and audit record in a dedicated transaction so it is preserved even when this call throws
      await this.tenantDb.withCompany(found.company_id, async (tx) => {
        await tx.$executeRawUnsafe(
          `UPDATE refresh_tokens SET revoked_at = now() WHERE family_id = $1::uuid AND revoked_at IS NULL`,
          found.family_id,
        );
        await tx.$executeRawUnsafe(
          `UPDATE sessions SET revoked_at = now() WHERE family_id = $1::uuid AND revoked_at IS NULL`,
          found.family_id,
        );
        await tx.$executeRawUnsafe(
          `INSERT INTO audit_logs (id, company_id, module, record_type, record_id, action, reason, ip_address, request_id, created_at)
           VALUES ($1::uuid, $2::uuid, 'auth', 'RefreshToken', $3::uuid, 'REFRESH_TOKEN_REUSE', 'Refresh token reuse detected — entire family revoked', $4, $5, now())`,
          crypto.randomUUID(),
          found.company_id,
          found.id,
          opts.ipAddress || null,
          crypto.randomUUID(),
        );
      });

      // Invalidate Redis session key if cacheStore available
      if (this.cacheStore) {
        await this.cacheStore.set(
          `session-revoked:${found.company_id}:${found.session_id}`,
          '1',
          900,
        );
      }

      throw new UnauthorizedException(
        'Refresh token reuse detected; all sessions revoked and terminated',
      );
    }

    // Check expiration
    if (new Date(found.expires_at).getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    // Legitimate rotation:
    const newRawToken = crypto.randomBytes(32).toString('hex');
    const newTokenHash = this.hashToken(newRawToken);
    const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const newRefreshTokenId = crypto.randomUUID();

    // 1. Mark current token revoked and replaced
    await tx.$executeRawUnsafe(
      `UPDATE refresh_tokens
       SET revoked_at = now(), replaced_by_id = $1::uuid
       WHERE id = $2::uuid`,
      newRefreshTokenId,
      found.id,
    );

    // 2. Insert new token in same family
    await tx.$executeRawUnsafe(
      `INSERT INTO refresh_tokens (id, company_id, user_id, session_id, family_id, token_hash, expires_at, user_agent, ip_address, created_at)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $6, $7, $8, $9, now())`,
      newRefreshTokenId,
      found.company_id,
      found.user_id,
      found.session_id,
      found.family_id,
      newTokenHash,
      newExpiresAt,
      opts.userAgent || null,
      opts.ipAddress || null,
    );

    // 3. Update session last seen
    await tx.$executeRawUnsafe(
      `UPDATE sessions SET last_seen_at = now() WHERE id = $1::uuid`,
      found.session_id,
    );

    // 4. Generate new access token
    const accessToken = this.generateAccessToken({
      sub: found.user_id,
      companyId: found.company_id,
      sid: found.session_id,
    });

    return {
      accessToken,
      refreshToken: newRawToken,
      sessionId: found.session_id,
    };
  }

  /**
   * Revokes a single session and its associated refresh tokens.
   */
  async revokeSession(tx: TenantPrisma, sessionId: string): Promise<void> {
    await tx.$executeRawUnsafe(
      `UPDATE sessions SET revoked_at = now() WHERE id = $1::uuid`,
      sessionId,
    );
    await tx.$executeRawUnsafe(
      `UPDATE refresh_tokens SET revoked_at = now() WHERE session_id = $1::uuid AND revoked_at IS NULL`,
      sessionId,
    );

    if (this.cacheStore) {
      await this.cacheStore.set(`session-revoked:${tx.currentCompanyId}:${sessionId}`, '1', 900);
    }
  }

  /**
   * Revokes all sessions for a user ("log out everywhere").
   */
  async revokeAllUserSessions(tx: TenantPrisma, userId: string): Promise<void> {
    const sessions = await tx.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM sessions WHERE user_id = $1::uuid AND revoked_at IS NULL`,
      userId,
    );

    await tx.$executeRawUnsafe(
      `UPDATE sessions SET revoked_at = now() WHERE user_id = $1::uuid AND revoked_at IS NULL`,
      userId,
    );
    await tx.$executeRawUnsafe(
      `UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1::uuid AND revoked_at IS NULL`,
      userId,
    );

    if (this.cacheStore) {
      for (const s of sessions) {
        await this.cacheStore.set(`session-revoked:${tx.currentCompanyId}:${s.id}`, '1', 900);
      }
    }
  }
}
