import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import crypto from 'node:crypto';
import argon2 from 'argon2';
import { ProvisioningContext, ProvisioningStep } from '../provisioning-step.interface.js';

@Injectable()
export class ManagingDirectorStep implements ProvisioningStep {
  readonly name = 'ManagingDirectorStep';
  readonly order = 30;

  async execute(ctx: ProvisioningContext, tx: Prisma.TransactionClient): Promise<void> {
    const mdRoleId = ctx.state.get('role:MANAGING_DIRECTOR') as string;
    const branchId = (ctx.branchId || ctx.state.get('headOfficeBranchId')) as string;

    const email = ctx.managingDirector.email.toLowerCase().trim();
    const isLocalMode = !!ctx.managingDirector.isLocalMode;

    let passwordHash = '!INVITED_UNSET_CREDENTIAL';
    let status = 'INVITED';

    if (isLocalMode) {
      status = 'ACTIVE';
      if (!ctx.managingDirector.password) {
        throw new Error('Local Managing Director requires an explicit initial password');
      }
      const rawPassword = ctx.managingDirector.password;
      passwordHash = await argon2.hash(rawPassword, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4,
      });
    }

    const user = await tx.user.upsert({
      where: { email },
      update: {
        fullName: ctx.managingDirector.fullName,
        phone: ctx.managingDirector.phone,
        ...(isLocalMode ? { passwordHash, status, isTwoFactorEnabled: true } : {}),
      },
      create: {
        companyId: ctx.companyId,
        email,
        passwordHash,
        fullName: ctx.managingDirector.fullName,
        phone: ctx.managingDirector.phone,
        status,
        isTwoFactorEnabled: isLocalMode,
      },
    });

    ctx.managingDirector.id = user.id;
    ctx.state.set('managingDirectorUserId', user.id);

    // Assign Managing Director role
    if (mdRoleId) {
      await tx.userRole.upsert({
        where: {
          companyId_userId_roleId: {
            companyId: ctx.companyId,
            userId: user.id,
            roleId: mdRoleId,
          },
        },
        update: {},
        create: {
          companyId: ctx.companyId,
          userId: user.id,
          roleId: mdRoleId,
        },
      });
    }

    // Assign Head Office branch as default
    if (branchId) {
      await tx.userBranch.upsert({
        where: {
          companyId_userId_branchId: {
            companyId: ctx.companyId,
            userId: user.id,
            branchId,
          },
        },
        update: { isDefault: true },
        create: {
          companyId: ctx.companyId,
          userId: user.id,
          branchId,
          isDefault: true,
        },
      });
    }

    // If Cloud mode, issue an invitation
    if (!isLocalMode) {
      const existingInvitation = await tx.invitation.findFirst({
        where: {
          companyId: ctx.companyId,
          email,
          acceptedAt: null,
          expiresAt: { gt: new Date() },
        },
      });

      if (!existingInvitation) {
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        await tx.invitation.create({
          data: {
            companyId: ctx.companyId,
            email,
            tokenHash,
            roleId: mdRoleId,
            expiresAt,
          },
        });

        ctx.state.set('invitationToken', rawToken);
      }
    }
  }
}
