import { Injectable, Optional } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { NotFoundException, UnauthorizedException } from '../../common/exceptions/app.exception.js';
import { PrismaService } from '../../database/prisma.service.js';
import { TenantDb } from '../../database/tenant-db.service.js';
import { AuthLockoutService } from './auth-lockout.service.js';
import type { AcceptInvitationDto } from './dto/accept-invitation.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import type { ResetPasswordDto } from './dto/reset-password.dto.js';
import type { UnlockDto } from './dto/unlock.dto.js';
import { InvitationService } from './invitation.service.js';
import { PasswordResetService } from './password-reset.service.js';
import { SessionItem, SessionService } from './session.service.js';
import { TokenService, type TokenPairResult } from './token.service.js';
import { verifyPassword } from './utils/password.util.js';

export interface AuthResult {
  tokens: TokenPairResult;
  user: {
    id: string;
    email: string;
    fullName: string;
    companyId: string;
  };
}

interface UserAuthRow {
  id: string;
  company_id: string;
  email: string;
  password_hash: string;
  status: string;
  failed_login_attempts: number;
  locked_until: Date | null;
  is_two_factor_enabled: boolean;
  full_name: string;
}

const DUMMY_HASH =
  '$argon2id$v=19$m=65536,p=4,t=3$OVepa75E4e0IuxT/4/mJKQ$uzqMAPA1FxwNUEvPs1IWw8btDiWJBjBGRcTCHKNUph4';

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly tenantDb: TenantDb,
    private readonly clsService: ClsService,
    private readonly tokenService: TokenService,
    private readonly lockoutService: AuthLockoutService,
    private readonly passwordResetService: PasswordResetService,
    @Optional() private readonly sessionService?: SessionService,
    @Optional() private readonly invitationService?: InvitationService,
  ) {}

  /**
   * Helper to perform pre-tenant user lookup via SECURITY DEFINER function (ARCH-AUTH-LOOKUP).
   */
  private async findUserByEmailPreTenant(email: string): Promise<UserAuthRow | null> {
    const rows = await this.prismaService.$queryRawUnsafe<UserAuthRow[]>(
      `SELECT id, company_id, email, password_hash, status, failed_login_attempts, locked_until, is_two_factor_enabled, full_name
       FROM auth_find_user_by_email($1::text)`,
      email.toLowerCase().trim(),
    );

    return rows[0] || null;
  }

  /**
   * Authenticates user, enforcing progressive lockout (OQ-02) and pre-tenant isolation.
   */
  async login(
    dto: LoginDto,
    _clientType: 'web' | 'desktop' = 'desktop',
    ip: string = '127.0.0.1',
    userAgent?: string,
  ): Promise<AuthResult> {
    const normalizedEmail = dto.email.toLowerCase().trim();

    await this.lockoutService.checkLockout(normalizedEmail, ip, dto.captchaToken);
    const user = await this.findUserByEmailPreTenant(normalizedEmail);

    const targetHash = user?.password_hash ?? DUMMY_HASH;
    const isPasswordValid = await verifyPassword(dto.password, targetHash);

    if (!user || !isPasswordValid) {
      await this.lockoutService.recordFailedAttempt(normalizedEmail, ip, user?.id);
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active or has been suspended');
    }

    await this.lockoutService.resetFailedAttempts(normalizedEmail, ip, user.id);
    await this.sessionService?.alertIfNewDevice(user, userAgent, ip);

    this.clsService.set('companyId', user.company_id);

    let tokens!: TokenPairResult;
    await this.tenantDb.transaction(async (tx) => {
      tokens = await this.tokenService.createSessionAndTokens(tx, {
        userId: user.id,
        companyId: user.company_id,
        userAgent,
        ipAddress: ip,
      });
    });

    return {
      tokens,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        companyId: user.company_id,
      },
    };
  }

  /**
   * Refreshes an existing session using rotating refresh tokens.
   */
  async refresh(
    rawRefreshToken: string,
    ip: string = '127.0.0.1',
    userAgent?: string,
  ): Promise<TokenPairResult> {
    const tokenHash = this.tokenService.hashToken(rawRefreshToken);
    const rows = await this.prismaService.$queryRawUnsafe<Array<{ company_id: string }>>(
      `SELECT company_id FROM refresh_tokens WHERE token_hash = $1 LIMIT 1`,
      tokenHash,
    );

    const companyId = rows[0]?.company_id;
    if (!companyId) {
      throw new UnauthorizedException('Invalid or unknown refresh token');
    }

    this.clsService.set('companyId', companyId);

    let result!: TokenPairResult;
    await this.tenantDb.transaction(async (tx) => {
      result = await this.tokenService.rotateRefreshToken(tx, rawRefreshToken, {
        userAgent,
        ipAddress: ip,
      });
    });

    return result;
  }

  /**
   * Logs out user session.
   */
  async logout(sessionId: string): Promise<void> {
    const companyId = this.clsService.get<string>('companyId');
    if (!companyId) return;

    await this.tenantDb.transaction(async (tx) => {
      await this.tokenService.revokeSession(tx, sessionId);
    });
  }

  /**
   * Retrieves profile of current user.
   */
  async getMe(userId: string, companyId: string) {
    this.clsService.set('companyId', companyId);

    let user:
      | {
          id: string;
          email: string;
          full_name: string;
          company_id: string;
          phone: string | null;
          status: string;
          is_two_factor_enabled: boolean;
          last_login_at: Date | null;
        }
      | undefined;

    await this.tenantDb.transaction(async (tx) => {
      const rows = await tx.$queryRawUnsafe<
        Array<{
          id: string;
          email: string;
          full_name: string;
          company_id: string;
          phone: string | null;
          status: string;
          is_two_factor_enabled: boolean;
          last_login_at: Date | null;
        }>
      >(
        `SELECT id, email, full_name, company_id, phone, status, is_two_factor_enabled, last_login_at
         FROM users
         WHERE id = $1::uuid AND company_id = $2::uuid
         LIMIT 1`,
        userId,
        companyId,
      );
      user = rows[0];
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      companyId: user.company_id,
      phone: user.phone,
      status: user.status,
      isTwoFactorEnabled: user.is_two_factor_enabled,
      lastLoginAt: user.last_login_at,
    };
  }

  /**
   * Accepts invitation and creates user record (S5).
   */
  async acceptInvitation(dto: AcceptInvitationDto): Promise<AuthResult> {
    if (!this.invitationService) {
      throw new NotFoundException('Invitation service is not available');
    }
    return this.invitationService.acceptInvitation(dto);
  }

  /**
   * Request password reset link (S5).
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    return this.passwordResetService.forgotPassword(email);
  }

  /**
   * Resets password using token (S5).
   */
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    return this.passwordResetService.resetPassword(dto);
  }

  /**
   * Lists active sessions for current user (A0.12 S1).
   */
  async listSessions(
    userId: string,
    companyId: string,
    currentSessionId?: string,
  ): Promise<SessionItem[]> {
    if (!this.sessionService) {
      return [];
    }
    return this.sessionService.listSessions(userId, companyId, currentSessionId);
  }

  /**
   * Revokes a specific session (A0.12 S1).
   */
  async revokeSession(
    userId: string,
    companyId: string,
    sessionId: string,
  ): Promise<{ message: string }> {
    if (!this.sessionService) {
      return { message: 'Session service unavailable' };
    }
    return this.sessionService.revokeSession(userId, companyId, sessionId);
  }

  /**
   * Revokes all active sessions for current user (A0.12 S1).
   */
  async logoutAll(userId: string, companyId: string): Promise<{ message: string }> {
    if (!this.sessionService) {
      return { message: 'Session service unavailable' };
    }
    return this.sessionService.logoutAll(userId, companyId);
  }

  /**
   * Request email unlock token for locked accounts (A0.12 S2).
   */
  async requestUnlock(email: string) {
    return this.lockoutService.requestUnlock(email);
  }

  /**
   * Unlocks progressive lockout via email token + TOTP (A0.12 S2).
   */
  async unlock(dto: UnlockDto) {
    return this.lockoutService.unlock(dto.token, dto.totpCode);
  }
}
