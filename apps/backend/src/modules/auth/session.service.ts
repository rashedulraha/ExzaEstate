import { Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { TenantDb } from '../../database/tenant-db.service.js';
import { EMAIL_PROVIDER, type EmailProvider } from '../../ports/index.js';
import { TokenService } from './token.service.js';

export interface SessionItem {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastSeenAt: string;
  isCurrent: boolean;
}

@Injectable()
export class SessionService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly tokenService: TokenService,
    @Optional() @Inject(EMAIL_PROVIDER) private readonly emailProvider?: EmailProvider,
  ) {}

  /**
   * Lists active sessions for current user (A0.12 S1).
   */
  async listSessions(
    userId: string,
    companyId: string,
    currentSessionId?: string,
  ): Promise<SessionItem[]> {
    const rows = await this.tenantDb.withCompany(companyId, async (tx) => {
      return tx.$queryRawUnsafe<
        Array<{
          id: string;
          user_agent: string | null;
          ip_address: string | null;
          created_at: Date;
          last_seen_at: Date;
        }>
      >(
        `SELECT id, user_agent, ip_address, created_at, last_seen_at
         FROM sessions
         WHERE user_id = $1::uuid AND revoked_at IS NULL
         ORDER BY created_at DESC`,
        userId,
      );
    });

    return rows.map((r) => ({
      id: r.id,
      userAgent: r.user_agent,
      ipAddress: r.ip_address,
      createdAt: r.created_at.toISOString(),
      lastSeenAt: r.last_seen_at.toISOString(),
      isCurrent: r.id === currentSessionId,
    }));
  }

  /**
   * Revokes a specific session (A0.12 S1).
   */
  async revokeSession(
    userId: string,
    companyId: string,
    sessionId: string,
  ): Promise<{ message: string }> {
    await this.tenantDb.withCompany(companyId, async (tx) => {
      const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM sessions WHERE id = $1::uuid AND user_id = $2::uuid AND revoked_at IS NULL`,
        sessionId,
        userId,
      );
      if (rows.length === 0) {
        throw new NotFoundException('Session not found or already revoked');
      }
      await this.tokenService.revokeSession(tx, sessionId);
    });

    return { message: 'Session revoked successfully' };
  }

  /**
   * Revokes all active sessions for current user (A0.12 S1).
   */
  async logoutAll(userId: string, companyId: string): Promise<{ message: string }> {
    await this.tenantDb.withCompany(companyId, async (tx) => {
      await this.tokenService.revokeAllUserSessions(tx, userId);
    });

    return { message: 'All sessions revoked successfully' };
  }

  /**
   * Sends security alert if logging in from an unrecognized user agent (A0.12 S1).
   */
  async alertIfNewDevice(
    user: { id: string; email: string; company_id: string },
    userAgent?: string,
    ip: string = '127.0.0.1',
  ): Promise<void> {
    if (!this.emailProvider || !userAgent) {
      return;
    }

    const pastSessions = await this.tenantDb.withCompany(user.company_id, async (tx) => {
      return tx.$queryRawUnsafe<Array<{ user_agent: string | null }>>(
        `SELECT user_agent FROM sessions WHERE user_id = $1::uuid`,
        user.id,
      );
    });

    const isKnownDevice = pastSessions.some((s) => s.user_agent === userAgent);
    if (pastSessions.length > 0 && !isKnownDevice) {
      await this.emailProvider.send({
        to: user.email,
        subject: 'Security Alert: New Device Login to ExzaEstate',
        html: `<p>A new device (${userAgent}) logged into your ExzaEstate account from IP ${ip}. If this was not you, please log in and revoke this session immediately.</p>`,
        text: `A new device (${userAgent}) logged into your ExzaEstate account from IP ${ip}. If this was not you, please log in and revoke this session immediately.`,
      });
    }
  }
}
