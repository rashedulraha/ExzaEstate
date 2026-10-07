import { Injectable, Optional } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { NotFoundException, UnauthorizedException } from '../../common/exceptions/app.exception.js';
import { PrismaService } from '../../database/prisma.service.js';
import { SystemPrisma } from '../../database/system-prisma.service.js';
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
import { PermissionService } from './permission.service.js';
import {
  authenticateSuperAdminPreTenant,
  fetchTenantUserProfile,
  handleSuperAdminGetMe,
  handleSuperAdminLogin,
  resolveTenantAuthUser,
  revokeSuperAdminSession,
  type AuthResult,
  type UserAuthRow,
  type UserProfileResult,
} from './auth.helpers.js';

export type { AuthResult, UserProfileResult };

const DUMMY_HASH =
  '$argon2id$v=19$m=65536,p=4,t=3$OVepa75E4e0IuxT/4/mJKQ$uzqMAPA1FxwNUEvPs1IWw8btDiWJBjBGRcTCHKNUph4';

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly systemPrisma: SystemPrisma,
    private readonly tenantDb: TenantDb,
    private readonly clsService: ClsService,
    private readonly tokenService: TokenService,
    private readonly lockoutService: AuthLockoutService,
    private readonly passwordResetService: PasswordResetService,
    @Optional() private readonly permissionService?: PermissionService,
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

  private async validateAndGetUser(
    dto: LoginDto,
    normalizedEmail: string,
    ip: string,
  ): Promise<UserAuthRow> {
    await this.lockoutService.checkLockout(normalizedEmail, ip, dto.captchaToken);
    const user = await this.findUserByEmailPreTenant(normalizedEmail);

    if (user) {
      const targetHash = user.password_hash ?? DUMMY_HASH;
      const isPasswordValid = await verifyPassword(dto.password, targetHash);

      if (!isPasswordValid) {
        await this.lockoutService.recordFailedAttempt(normalizedEmail, ip, user.id);
        throw new UnauthorizedException('Invalid email or password');
      }

      if (user.status !== 'ACTIVE') {
        throw new UnauthorizedException('Account is not active or has been suspended');
      }

      return user;
    }

    const sysUser = await authenticateSuperAdminPreTenant(
      this.systemPrisma,
      normalizedEmail,
      dto.password,
      verifyPassword,
    );
    if (sysUser) {
      return sysUser;
    }

    await this.lockoutService.recordFailedAttempt(normalizedEmail, ip);
    throw new UnauthorizedException('Invalid email or password');
  }

  private async buildAuthUser(user: UserAuthRow): Promise<AuthResult['user']> {
    return resolveTenantAuthUser({
      systemPrisma: this.systemPrisma,
      permissionService: this.permissionService,
      user,
    });
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
    const user = await this.validateAndGetUser(dto, normalizedEmail, ip);

    await this.lockoutService.resetFailedAttempts(normalizedEmail, ip, user.id);
    await this.sessionService?.alertIfNewDevice(user, userAgent, ip);

    if (user.company_id === '00000000-0000-0000-0000-000000000000') {
      return handleSuperAdminLogin({
        systemPrisma: this.systemPrisma,
        tokenService: this.tokenService,
        user,
        ip,
        userAgent,
      });
    }

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

    const authUser = await this.buildAuthUser(user);

    return {
      tokens,
      user: authUser,
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
    let companyId: string | undefined;

    try {
      const rows = await this.systemPrisma.executeWithReason(
        '// SYSTEM-SCOPE: Resolve tenant company for refresh token',
        async (client) => {
          return client.$queryRawUnsafe<Array<{ company_id: string }>>(
            `SELECT company_id FROM refresh_tokens WHERE token_hash = $1 LIMIT 1`,
            tokenHash,
          );
        },
      );
      companyId = rows[0]?.company_id;
    } catch {
      // Fallback for isolated unit test environments
      const rows = await this.prismaService.$queryRawUnsafe<Array<{ company_id: string }>>(
        `SELECT company_id FROM refresh_tokens WHERE token_hash = $1 LIMIT 1`,
        tokenHash,
      );
      companyId = rows[0]?.company_id;
    }

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

    if (companyId === '00000000-0000-0000-0000-000000000000') {
      return revokeSuperAdminSession(this.systemPrisma, sessionId);
    }

    await this.tenantDb.transaction(async (tx) => {
      await this.tokenService.revokeSession(tx, sessionId);
    });
  }

  private async getTenantMe(userId: string, companyId: string): Promise<UserProfileResult> {
    this.clsService.set('companyId', companyId);
    return fetchTenantUserProfile({
      tenantDb: this.tenantDb,
      systemPrisma: this.systemPrisma,
      permissionService: this.permissionService,
      companyId,
      userId,
    });
  }

  /**
   * Retrieves profile of current user.
   */
  async getMe(userId: string, companyId: string) {
    if (companyId === '00000000-0000-0000-0000-000000000000') {
      return handleSuperAdminGetMe(this.systemPrisma, userId);
    }

    return this.getTenantMe(userId, companyId);
  }

  /**
   * Accepts invitation and creates user record (S5).
   */
  async acceptInvitation(dto: AcceptInvitationDto): Promise<AuthResult> {
    if (!this.invitationService) {
      throw new NotFoundException('Invitation service is not available');
    }
    const result = await this.invitationService.acceptInvitation(dto);
    const resolved = this.permissionService
      ? await this.permissionService.resolvePermissions(result.user.companyId, result.user.id)
      : undefined;
    return {
      tokens: result.tokens,
      user: {
        ...result.user,
        permissions: resolved?.permissions ?? [],
        scopes: resolved?.scopes ?? {},
        branchIds: resolved?.branchIds ?? [],
      },
    };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    return this.passwordResetService.forgotPassword(email);
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    return this.passwordResetService.resetPassword(dto);
  }

  async listSessions(
    userId: string,
    companyId: string,
    currentSessionId?: string,
  ): Promise<SessionItem[]> {
    return this.sessionService?.listSessions(userId, companyId, currentSessionId) ?? [];
  }

  async revokeSession(
    userId: string,
    companyId: string,
    sessionId: string,
  ): Promise<{ message: string }> {
    if (!this.sessionService) return { message: 'Session service unavailable' };
    return this.sessionService.revokeSession(userId, companyId, sessionId);
  }

  async logoutAll(userId: string, companyId: string): Promise<{ message: string }> {
    if (!this.sessionService) return { message: 'Session service unavailable' };
    return this.sessionService.logoutAll(userId, companyId);
  }

  async requestUnlock(email: string) {
    return this.lockoutService.requestUnlock(email);
  }

  async unlock(dto: UnlockDto) {
    return this.lockoutService.unlock(dto.token, dto.totpCode);
  }
}
