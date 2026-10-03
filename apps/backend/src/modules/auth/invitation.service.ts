import crypto from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { ValidationException } from '../../common/exceptions/app.exception.js';
import { PrismaService } from '../../database/prisma.service.js';
import { TenantDb } from '../../database/tenant-db.service.js';
import type { AcceptInvitationDto } from './dto/accept-invitation.dto.js';
import { TokenService, type TokenPairResult } from './token.service.js';
import { hashPassword, validatePasswordPolicy } from './utils/password.util.js';

export interface AcceptInvitationResult {
  tokens: TokenPairResult;
  user: {
    id: string;
    email: string;
    fullName: string;
    companyId: string;
  };
}

@Injectable()
export class InvitationService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly tenantDb: TenantDb,
    private readonly clsService: ClsService,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * Accepts invitation and creates user record (S5).
   */
  async acceptInvitation(dto: AcceptInvitationDto): Promise<AcceptInvitationResult> {
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
}
