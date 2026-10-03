import crypto from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { ValidationException } from '../../common/exceptions/app.exception.js';
import { PrismaService } from '../../database/prisma.service.js';
import { TenantDb } from '../../database/tenant-db.service.js';
import type { ResetPasswordDto } from './dto/reset-password.dto.js';
import { TokenService } from './token.service.js';
import { hashPassword, validatePasswordPolicy } from './utils/password.util.js';

interface PreTenantUser {
  id: string;
  company_id: string;
}

@Injectable()
export class PasswordResetService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly tenantDb: TenantDb,
    private readonly clsService: ClsService,
    private readonly tokenService: TokenService,
  ) {}

  async forgotPassword(email: string): Promise<{ message: string }> {
    const normalized = email.toLowerCase().trim();
    const rows = await this.prismaService.$queryRawUnsafe<PreTenantUser[]>(
      `SELECT id, company_id FROM auth_find_user_by_email($1::text)`,
      normalized,
    );
    const user = rows[0];

    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      this.clsService.set('companyId', user.company_id);
      await this.tenantDb.transaction(async (tx) => {
        await tx.$executeRawUnsafe(
          `INSERT INTO password_resets (id, company_id, user_id, token_hash, expires_at, created_at)
           VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, now())`,
          crypto.randomUUID(),
          user.company_id,
          user.id,
          tokenHash,
          expiresAt,
        );
      });
    }

    return {
      message: 'If an account exists with this email, instructions have been sent.',
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    validatePasswordPolicy(dto.newPassword);
    const tokenHash = crypto.createHash('sha256').update(dto.token).digest('hex');

    const rows = await this.prismaService.$queryRawUnsafe<
      Array<{
        id: string;
        company_id: string;
        user_id: string;
        expires_at: Date;
        used_at: Date | null;
      }>
    >(
      `SELECT id, company_id, user_id, expires_at, used_at
       FROM auth_find_reset_by_token_hash($1::text)`,
      tokenHash,
    );

    const resetRecord = rows[0];
    if (!resetRecord || resetRecord.used_at !== null) {
      throw new ValidationException('Password reset token is invalid or has already been used');
    }

    if (new Date(resetRecord.expires_at).getTime() < Date.now()) {
      throw new ValidationException('Password reset token has expired');
    }

    this.clsService.set('companyId', resetRecord.company_id);
    const newHash = await hashPassword(dto.newPassword);

    await this.tenantDb.transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2::uuid`,
        newHash,
        resetRecord.user_id,
      );

      await tx.$executeRawUnsafe(
        `UPDATE password_resets SET used_at = now() WHERE id = $1::uuid`,
        resetRecord.id,
      );

      await this.tokenService.revokeAllUserSessions(tx, resetRecord.user_id);
    });

    return {
      message: 'Password has been successfully reset. Please log in with your new password.',
    };
  }
}
