import { HttpStatus, Inject, Injectable, Optional } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import argon2 from 'argon2';
import type { ErrorCode } from '@exzaestate/shared';
import { AppException, NotFoundException } from '../../common/exceptions/app.exception.js';
import { TenantDb } from '../../database/tenant-db.service.js';
import { AuditService } from '../../platform/audit/audit.service.js';
import { SecurityEventsService } from '../../platform/security/security-events.service.js';
import { CACHE_STORE, type CacheStore } from '../../ports/index.js';
import type {
  AdminResetPasswordDto,
  UpdateUserBranchesDto,
  UpdateUserRolesDto,
} from './dto/user-admin.dto.js';
import { PermissionService } from './permission.service.js';
import { formatUser } from './user-admin.service.js';

@Injectable()
export class UserLifecycleService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly permissionService: PermissionService,
    private readonly auditService: AuditService,
    @Optional() private readonly securityEventsService?: SecurityEventsService,
    @Optional() @Inject(CACHE_STORE) private readonly cacheStore?: CacheStore,
  ) {}

  async deactivateUser(companyId: string, userId: string, actorUserId: string) {
    if (userId === actorUserId) {
      throw new AppException(
        'CANNOT_DEACTIVATE_SELF' as unknown as ErrorCode,
        'Cannot deactivate own account',
        {},
        HttpStatus.BAD_REQUEST,
      );
    }

    const revokedSessionIds: string[] = [];

    await this.tenantDb.transaction(async (tx) => {
      const u = await tx.user.findUnique({ where: { id: userId, companyId } });
      if (!u) throw new NotFoundException(`User with id "${userId}" not found`);

      await tx.user.update({ where: { id: userId, companyId }, data: { status: 'INACTIVE' } });

      const sessions = await tx.session.findMany({ where: { userId, companyId, revokedAt: null } });
      for (const s of sessions) revokedSessionIds.push(s.id);

      await tx.session.updateMany({
        where: { userId, companyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await this.auditService.record(tx, {
        action: 'user.deactivated',
        module: 'auth',
        recordType: 'User',
        recordId: userId,
        before: { status: u.status },
        after: { status: 'INACTIVE' },
      });
    });

    if (this.cacheStore) {
      for (const sid of revokedSessionIds) {
        await this.cacheStore.set(`session-revoked:${companyId}:${sid}`, '1', 900);
      }
    }

    await this.permissionService.invalidateUserPermissions(companyId, userId);
    return { success: true };
  }

  async reactivateUser(companyId: string, userId: string, _actorUserId: string) {
    await this.tenantDb.transaction(async (tx) => {
      const u = await tx.user.findUnique({ where: { id: userId, companyId } });
      if (!u) throw new NotFoundException(`User with id "${userId}" not found`);

      await tx.user.update({ where: { id: userId, companyId }, data: { status: 'ACTIVE' } });

      await this.auditService.record(tx, {
        action: 'user.reactivated',
        module: 'auth',
        recordType: 'User',
        recordId: userId,
        before: { status: u.status },
        after: { status: 'ACTIVE' },
      });
    });

    await this.permissionService.invalidateUserPermissions(companyId, userId);
    return { success: true };
  }

  async updateUserRoles(
    companyId: string,
    userId: string,
    dto: UpdateUserRolesDto,
    _actorUserId: string,
  ) {
    const updated = await this.tenantDb.transaction(async (tx) => {
      const u = await tx.user.findUnique({ where: { id: userId, companyId } });
      if (!u) throw new NotFoundException(`User with id "${userId}" not found`);

      await tx.userRole.deleteMany({ where: { userId, companyId } });
      if (dto.roleIds.length) {
        await tx.userRole.createMany({
          data: dto.roleIds.map((rId) => ({ companyId, userId, roleId: rId })),
        });
      }

      await this.auditService.record(tx, {
        action: 'user.roles_updated',
        module: 'auth',
        recordType: 'User',
        recordId: userId,
        after: { roleIds: dto.roleIds },
      });

      return tx.user.findUniqueOrThrow({
        where: { id: userId, companyId },
        include: {
          roles: { include: { role: { select: { id: true, name: true, code: true } } } },
          branches: { select: { branchId: true, isDefault: true } },
        },
      });
    });

    await this.permissionService.invalidateUserPermissions(companyId, userId);
    return formatUser(updated);
  }

  async updateUserBranches(
    companyId: string,
    userId: string,
    dto: UpdateUserBranchesDto,
    _actorUserId: string,
  ) {
    const updated = await this.tenantDb.transaction(async (tx) => {
      const u = await tx.user.findUnique({ where: { id: userId, companyId } });
      if (!u) throw new NotFoundException(`User with id "${userId}" not found`);

      await tx.userBranch.deleteMany({ where: { userId, companyId } });
      if (dto.branches.length) {
        await tx.userBranch.createMany({
          data: dto.branches.map((b) => ({
            companyId,
            userId,
            branchId: b.branchId,
            isDefault: !!b.isDefault,
          })),
        });
      }

      await this.auditService.record(tx, {
        action: 'user.branches_updated',
        module: 'auth',
        recordType: 'User',
        recordId: userId,
        after: { branches: dto.branches },
      });

      return tx.user.findUniqueOrThrow({
        where: { id: userId, companyId },
        include: {
          roles: { include: { role: { select: { id: true, name: true, code: true } } } },
          branches: { select: { branchId: true, isDefault: true } },
        },
      });
    });

    await this.permissionService.invalidateUserPermissions(companyId, userId);
    return formatUser(updated);
  }

  async adminResetPassword(
    companyId: string,
    userId: string,
    dto: AdminResetPasswordDto,
    _actorUserId: string,
  ) {
    const pwd = dto.temporaryPassword ?? 'TempPassword123!Secure';
    const passwordHash = await argon2.hash(pwd, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    await this.tenantDb.transaction(async (tx) => {
      const u = await tx.user.findUnique({ where: { id: userId, companyId } });
      if (!u) throw new NotFoundException(`User with id "${userId}" not found`);

      await tx.user.update({
        where: { id: userId, companyId },
        data: { passwordHash, mustChangePassword: true, failedLoginAttempts: 0, lockedUntil: null },
      });

      await tx.session.updateMany({
        where: { userId, companyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await this.auditService.record(tx, {
        action: 'user.password_reset_by_admin',
        module: 'auth',
        recordType: 'User',
        recordId: userId,
        reason: 'Administrator reset user password',
      });
    });

    await this.permissionService.invalidateUserPermissions(companyId, userId);
    return { success: true, mustChangePassword: true };
  }

  async adminReset2Fa(companyId: string, userId: string, _actorUserId: string) {
    const revokedSessionIds: string[] = [];

    await this.tenantDb.transaction(async (tx) => {
      const u = await tx.user.findUnique({ where: { id: userId, companyId } });
      if (!u) throw new NotFoundException(`User with id "${userId}" not found`);

      await tx.user.update({
        where: { id: userId, companyId },
        data: {
          isTwoFactorEnabled: false,
          twoFactorSecret: null,
          twoFactorRecoveryCodes: [],
          twoFactorEnrolledAt: null,
        },
      });

      const sessions = await tx.session.findMany({ where: { userId, companyId, revokedAt: null } });
      for (const s of sessions) revokedSessionIds.push(s.id);

      await tx.session.updateMany({
        where: { userId, companyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await this.auditService.record(tx, {
        action: 'user.2fa_reset_by_admin',
        module: 'auth',
        recordType: 'User',
        recordId: userId,
        reason: 'Administrator reset user 2FA enrollment',
      });

      if (this.securityEventsService) {
        await this.securityEventsService.record(
          {
            companyId,
            userId,
            eventType: 'TWO_FACTOR_RESET',
            severity: 'WARN',
            details: { resetByAdmin: true },
          },
          tx as unknown as Prisma.TransactionClient,
        );
      }
    });

    if (this.cacheStore) {
      for (const sid of revokedSessionIds) {
        await this.cacheStore.set(`session-revoked:${companyId}:${sid}`, '1', 900);
      }
    }

    await this.permissionService.invalidateUserPermissions(companyId, userId);
    return { success: true };
  }
}
