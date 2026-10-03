import { HttpStatus, Injectable } from '@nestjs/common';
import type { DataScope, ErrorCode } from '@exzaestate/shared';
import { AppException, NotFoundException } from '../../common/exceptions/app.exception.js';
import { TenantDb } from '../../database/tenant-db.service.js';
import { AuditService } from '../../platform/audit/audit.service.js';
import type {
  CloneRoleDto,
  CreateRoleDto,
  UpdateRoleDto,
  UpdateRolePermissionsDto,
} from './dto/role.dto.js';
import { PermissionService } from './permission.service.js';

export interface RoleDetail {
  id: string;
  companyId: string;
  name: string;
  code: string;
  description: string | null;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
  permissions: Array<{ permissionCode: string; scope: string | null }>;
}

function formatRole(r: {
  id: string;
  companyId: string;
  name: string;
  code: string;
  description: string | null;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
  rolePermissions: Array<{ permissionCode: string; scope: string | null }>;
}): RoleDetail {
  return {
    id: r.id,
    companyId: r.companyId,
    name: r.name,
    code: r.code,
    description: r.description,
    isSystem: r.isSystem,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    permissions: r.rolePermissions,
  };
}

@Injectable()
export class RoleService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly permissionService: PermissionService,
    private readonly auditService: AuditService,
  ) {}

  async listRoles(companyId: string) {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const roles = await tx.role.findMany({
        where: { companyId },
        include: {
          rolePermissions: { select: { permissionCode: true, scope: true } },
          _count: { select: { userRoles: true } },
        },
        orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      });

      return roles.map((r) => ({
        ...formatRole(r),
        userCount: r._count.userRoles,
        permissionCount: r.rolePermissions.length,
      }));
    });
  }

  async getRole(companyId: string, roleId: string): Promise<RoleDetail> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const role = await tx.role.findUnique({
        where: { id: roleId, companyId },
        include: { rolePermissions: { select: { permissionCode: true, scope: true } } },
      });
      if (!role) throw new NotFoundException(`Role with id "${roleId}" not found`);
      return formatRole(role);
    });
  }

  async createRole(
    companyId: string,
    dto: CreateRoleDto,
    _actorUserId: string,
  ): Promise<RoleDetail> {
    return this.tenantDb.transaction(async (tx) => {
      const existing = await tx.role.findUnique({
        where: { companyId_code: { companyId, code: dto.code } },
      });
      if (existing) {
        throw new AppException(
          'ROLE_CODE_EXISTS' as unknown as ErrorCode,
          `Role code "${dto.code}" exists`,
          {},
          HttpStatus.CONFLICT,
        );
      }

      const role = await tx.role.create({
        data: {
          companyId,
          code: dto.code,
          name: dto.name,
          description: dto.description ?? null,
          isSystem: false,
        },
      });

      if (dto.permissions && dto.permissions.length > 0) {
        await tx.rolePermission.createMany({
          data: dto.permissions.map((p) => ({
            companyId,
            roleId: role.id,
            permissionCode: p.permissionCode,
            scope: p.scope ?? null,
          })),
        });
      }

      await this.auditService.record(tx, {
        action: 'role.created',
        module: 'role',
        recordType: 'Role',
        recordId: role.id,
        after: { code: role.code, name: role.name, permissions: dto.permissions },
        reason: 'Custom role created by administrator',
      });

      const fullRole = await tx.role.findUniqueOrThrow({
        where: { id: role.id, companyId },
        include: { rolePermissions: { select: { permissionCode: true, scope: true } } },
      });
      return formatRole(fullRole);
    });
  }

  async cloneRole(
    companyId: string,
    roleId: string,
    dto: CloneRoleDto,
    actorUserId: string,
  ): Promise<RoleDetail> {
    const sourceRole = await this.getRole(companyId, roleId);
    return this.createRole(
      companyId,
      {
        code: dto.newCode,
        name: dto.newName,
        description: dto.description ?? `Cloned from ${sourceRole.name}`,
        permissions: sourceRole.permissions.map((p) => ({
          permissionCode: p.permissionCode,
          scope: (p.scope ?? undefined) as DataScope | undefined,
        })),
      },
      actorUserId,
    );
  }

  async updateRole(
    companyId: string,
    roleId: string,
    dto: UpdateRoleDto,
    _actorUserId: string,
  ): Promise<RoleDetail> {
    return this.tenantDb.transaction(async (tx) => {
      const existing = await tx.role.findUnique({ where: { id: roleId, companyId } });
      if (!existing) throw new NotFoundException(`Role with id "${roleId}" not found`);

      const updated = await tx.role.update({
        where: { id: roleId, companyId },
        data: {
          name: dto.name ?? existing.name,
          description: dto.description !== undefined ? dto.description : existing.description,
        },
        include: { rolePermissions: { select: { permissionCode: true, scope: true } } },
      });

      await this.auditService.record(tx, {
        action: 'role.updated',
        module: 'role',
        recordType: 'Role',
        recordId: roleId,
        before: { name: existing.name, description: existing.description },
        after: { name: updated.name, description: updated.description },
      });

      return formatRole(updated);
    });
  }

  async updateRolePermissions(
    companyId: string,
    roleId: string,
    dto: UpdateRolePermissionsDto,
    _actorUserId: string,
  ): Promise<RoleDetail> {
    const updated = await this.tenantDb.transaction(async (tx) => {
      const existing = await tx.role.findUnique({
        where: { id: roleId, companyId },
        include: { rolePermissions: true },
      });
      if (!existing) throw new NotFoundException(`Role with id "${roleId}" not found`);

      await tx.rolePermission.deleteMany({ where: { companyId, roleId } });

      if (dto.permissions.length > 0) {
        await tx.rolePermission.createMany({
          data: dto.permissions.map((p) => ({
            companyId,
            roleId,
            permissionCode: p.permissionCode,
            scope: p.scope ?? null,
          })),
        });
      }

      await this.auditService.record(tx, {
        action: 'role.permissions_updated',
        module: 'role',
        recordType: 'Role',
        recordId: roleId,
        before: { permissions: existing.rolePermissions },
        after: { permissions: dto.permissions },
        reason: 'Role permissions updated by administrator',
      });

      return tx.role.findUniqueOrThrow({
        where: { id: roleId, companyId },
        include: { rolePermissions: { select: { permissionCode: true, scope: true } } },
      });
    });

    await this.permissionService.invalidateRolePermissions(companyId, roleId);
    return formatRole(updated);
  }

  async deleteRole(companyId: string, roleId: string, _actorUserId: string): Promise<void> {
    await this.tenantDb.transaction(async (tx) => {
      const role = await tx.role.findUnique({
        where: { id: roleId, companyId },
        include: { _count: { select: { userRoles: true } } },
      });

      if (!role) throw new NotFoundException(`Role with id "${roleId}" not found`);
      if (role.isSystem) {
        throw new AppException(
          'CANNOT_DELETE_SYSTEM_ROLE' as unknown as ErrorCode,
          'System roles cannot be deleted',
          {},
          HttpStatus.BAD_REQUEST,
        );
      }
      if (role._count.userRoles > 0) {
        throw new AppException(
          'ROLE_IN_USE' as unknown as ErrorCode,
          'Role is currently assigned to users and cannot be deleted',
          {},
          HttpStatus.BAD_REQUEST,
        );
      }

      await tx.rolePermission.deleteMany({ where: { companyId, roleId } });
      await tx.role.delete({ where: { id: roleId, companyId } });

      await this.auditService.record(tx, {
        action: 'role.deleted',
        module: 'role',
        recordType: 'Role',
        recordId: roleId,
        before: { code: role.code, name: role.name },
      });
    });

    await this.permissionService.invalidateRolePermissions(companyId, roleId);
  }
}
