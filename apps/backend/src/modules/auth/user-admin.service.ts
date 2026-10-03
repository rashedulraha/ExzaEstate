import { Injectable } from '@nestjs/common';
import argon2 from 'argon2';
import { ConflictException, NotFoundException } from '../../common/exceptions/app.exception.js';
import { TenantDb } from '../../database/tenant-db.service.js';
import { AuditService } from '../../platform/audit/audit.service.js';
import type { CreateUserAdminDto, InviteUserDto, QueryUsersDto } from './dto/user-admin.dto.js';
import { InvitationService } from './invitation.service.js';

export function formatUser(u: {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  status: string;
  mustChangePassword: boolean;
  isTwoFactorEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  roles?: Array<{ role: { id: string; name: string; code: string } }>;
  branches?: Array<{ branchId: string; isDefault: boolean }>;
}) {
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    phone: u.phone,
    status: u.status,
    mustChangePassword: u.mustChangePassword,
    isTwoFactorEnabled: u.isTwoFactorEnabled,
    roles: u.roles?.map((r) => r.role) ?? [],
    branches: u.branches?.map((b) => ({ branchId: b.branchId, isDefault: b.isDefault })) ?? [],
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

@Injectable()
export class UserAdminService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly invitationService: InvitationService,
    private readonly auditService: AuditService,
  ) {}

  async listUsers(companyId: string, q: QueryUsersDto) {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const page = q.page ?? 1;
      const limit = q.limit ?? 20;
      const skip = (page - 1) * limit;

      const where: Record<string, unknown> = { companyId };
      if (q.status) where.status = q.status;
      if (q.roleId) where.roles = { some: { roleId: q.roleId } };
      if (q.branchId) where.branches = { some: { branchId: q.branchId } };
      if (q.search) {
        where.OR = [
          { email: { contains: q.search, mode: 'insensitive' } },
          { fullName: { contains: q.search, mode: 'insensitive' } },
        ];
      }

      const [total, users] = await Promise.all([
        tx.user.count({ where }),
        tx.user.findMany({
          where,
          include: {
            roles: { include: { role: { select: { id: true, name: true, code: true } } } },
            branches: { select: { branchId: true, isDefault: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
      ]);

      return {
        items: users.map(formatUser),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    });
  }

  async getUser(companyId: string, userId: string) {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const u = await tx.user.findUnique({
        where: { id: userId, companyId },
        include: {
          roles: { include: { role: { select: { id: true, name: true, code: true } } } },
          branches: { select: { branchId: true, isDefault: true } },
        },
      });
      if (!u) throw new NotFoundException(`User with id "${userId}" not found`);
      return formatUser(u);
    });
  }

  async inviteUser(companyId: string, dto: InviteUserDto, _actorUserId: string) {
    return this.tenantDb.transaction(async (tx) => {
      const inv = await this.invitationService.createInvitation(companyId, dto.email, dto.roleId);
      await this.auditService.record(tx, {
        action: 'user.invited',
        module: 'auth',
        recordType: 'Invitation',
        recordId: inv.id,
        after: { email: dto.email, roleId: dto.roleId },
      });
      return inv;
    });
  }

  async createUser(companyId: string, dto: CreateUserAdminDto, _actorUserId: string) {
    const existing = await this.tenantDb.withCompany(companyId, async (tx) => {
      return tx.user.findFirst({ where: { email: dto.email.toLowerCase().trim() } });
    });
    if (existing) throw new ConflictException(`Email "${dto.email}" is already registered`);

    const passwordHash = await argon2.hash(dto.temporaryPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const user = await this.tenantDb.transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          companyId,
          email: dto.email.toLowerCase().trim(),
          fullName: dto.fullName.trim(),
          phone: dto.phone?.trim() ?? null,
          passwordHash,
          mustChangePassword: dto.mustChangePassword ?? true,
          status: 'ACTIVE',
        },
      });

      if (dto.roleIds?.length) {
        await tx.userRole.createMany({
          data: dto.roleIds.map((rId) => ({ companyId, userId: u.id, roleId: rId })),
        });
      }

      if (dto.branchIds?.length) {
        await tx.userBranch.createMany({
          data: dto.branchIds.map((bId) => ({
            companyId,
            userId: u.id,
            branchId: bId,
            isDefault: bId === dto.defaultBranchId,
          })),
        });
      }

      await this.auditService.record(tx, {
        action: 'user.created',
        module: 'auth',
        recordType: 'User',
        recordId: u.id,
        after: { email: u.email, fullName: u.fullName, roles: dto.roleIds },
      });

      return tx.user.findUniqueOrThrow({
        where: { id: u.id, companyId },
        include: {
          roles: { include: { role: { select: { id: true, name: true, code: true } } } },
          branches: { select: { branchId: true, isDefault: true } },
        },
      });
    });

    return formatUser(user);
  }
}
