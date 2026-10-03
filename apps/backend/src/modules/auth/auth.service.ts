import crypto from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import {
  NotFoundException,
  UnauthorizedException,
  ValidationException,
} from '../../common/exceptions/app.exception.js';
import { PrismaService } from '../../database/prisma.service.js';
import { TenantDb } from '../../database/tenant-db.service.js';
import { AuthLockoutService } from './auth-lockout.service.js';
import type { AcceptInvitationDto } from './dto/accept-invitation.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import type { ResetPasswordDto } from './dto/reset-password.dto.js';
import { PasswordResetService } from './password-reset.service.js';
import { TokenService, type TokenPairResult } from './token.service.js';
import { hashPassword, validatePasswordPolicy, verifyPassword } from './utils/password.util.js';

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

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly tenantDb: TenantDb,
    private readonly clsService: ClsService,
    private readonly tokenService: TokenService,
    private readonly lockoutService: AuthLockoutService,
    private readonly passwordResetService: PasswordResetService,
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

    // 1. Check lockout flag (OQ-02: failure counter per (email, ip))
    await this.lockoutService.checkLockout(normalizedEmail, ip);

    // 2. Pre-tenant user lookup via SECURITY DEFINER function
    const user = await this.findUserByEmailPreTenant(normalizedEmail);

    // Constant-time failure simulation to prevent timing attacks / username enumeration
    const dummyHash =
      '$argon2id$v=19$m=65536,p=4,t=3$OVepa75E4e0IuxT/4/mJKQ$uzqMAPA1FxwNUEvPs1IWw8btDiWJBjBGRcTCHKNUph4';
    const targetHash = user ? user.password_hash : dummyHash;

    const isPasswordValid = await verifyPassword(dto.password, targetHash);

    if (!user || !isPasswordValid) {
      // Record failure for (email, ip)
      await this.lockoutService.recordFailedAttempt(normalizedEmail, ip, user?.id);

      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active or has been suspended');
    }

    // Reset failed login attempts on success
    await this.lockoutService.resetFailedAttempts(normalizedEmail, ip, user.id);

    // 3. Set CLS tenant context and create session inside tenantDb transaction
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
    // 1. Find token to discover companyId
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
    validatePasswordPolicy(dto.password);
    const tokenHash = crypto.createHash('sha256').update(dto.token).digest('hex');

    // 1. Lookup invitation via SECURITY DEFINER function
    const invRows = await this.prismaService.$queryRawUnsafe<
      Array<{
        id: string;
        company_id: string;
        email: string;
        role_id: string | null;
        expires_at: Date;
        accepted_at: Date | null;
      }>
    >(
      `SELECT id, company_id, email, role_id, expires_at, accepted_at
       FROM auth_find_invitation_by_token_hash($1::text)`,
      tokenHash,
    );

    const invitation = invRows[0];
    if (!invitation) {
      throw new NotFoundException('Invitation not found or invalid token');
    }

    if (invitation.accepted_at !== null) {
      throw new ValidationException('Invitation has already been accepted');
    }

    if (new Date(invitation.expires_at).getTime() < Date.now()) {
      throw new ValidationException('Invitation has expired');
    }

    // 2. Set CLS context & insert new user
    this.clsService.set('companyId', invitation.company_id);
    const hashedPassword = await hashPassword(dto.password);
    const newUserId = crypto.randomUUID();

    let tokens!: TokenPairResult;
    await this.tenantDb.transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `INSERT INTO users (id, company_id, email, password_hash, full_name, status, created_at, updated_at)
         VALUES ($1::uuid, $2::uuid, $3, $4, $5, 'ACTIVE', now(), now())`,
        newUserId,
        invitation.company_id,
        invitation.email,
        hashedPassword,
        dto.fullName,
      );

      await tx.$executeRawUnsafe(
        `UPDATE invitations SET accepted_at = now() WHERE id = $1::uuid`,
        invitation.id,
      );

      tokens = await this.tokenService.createSessionAndTokens(tx, {
        userId: newUserId,
        companyId: invitation.company_id,
      });
    });

    return {
      tokens,
      user: {
        id: newUserId,
        email: invitation.email,
        fullName: dto.fullName,
        companyId: invitation.company_id,
      },
    };
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
}
