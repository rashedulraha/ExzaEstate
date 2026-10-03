import { Injectable } from '@nestjs/common';
import { ERROR_CODES, PERMISSIONS } from '@exzaestate/shared';
import { AppException } from '../../common/exceptions/app.exception.js';
import { TenantDb } from '../../database/tenant-db.service.js';
import type { TenantPrisma } from '../../database/tenant-prisma.js';
import { AuditService } from '../../platform/audit/audit.service.js';
import { PermissionService } from '../auth/permission.service.js';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto.js';

function cleanNullable(val: string | null | undefined): string | null | undefined {
  if (val === undefined) return undefined;
  if (val === null) return null;
  return val.trim();
}

@Injectable()
export class BranchService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly auditService: AuditService,
    private readonly permissionService: PermissionService,
  ) {}

  async listBranches(userId: string) {
    return this.tenantDb.transaction(async (tx) => {
      const companyId = tx.currentCompanyId;
      const { scopes, branchIds } = await this.permissionService.resolvePermissions(
        companyId,
        userId,
      );

      const branchScope = scopes[PERMISSIONS.BRANCH_VIEW];
      const requiresBranchFilter = branchScope === 'BRANCH' || branchScope === 'OWN';

      return tx.branch.findMany({
        where: {
          companyId,
          deletedAt: null,
          ...(requiresBranchFilter ? { id: { in: branchIds } } : {}),
        },
        orderBy: [{ isHeadOffice: 'desc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          code: true,
          address: true,
          phone: true,
          email: true,
          isHeadOffice: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { departments: true },
          },
        },
      });
    });
  }

  async getBranch(branchId: string, userId: string) {
    return this.tenantDb.transaction(async (tx) => {
      const companyId = tx.currentCompanyId;
      await this.assertBranchAccess(companyId, userId, branchId, PERMISSIONS.BRANCH_VIEW);

      const branch = await tx.branch.findFirst({
        where: { id: branchId, companyId, deletedAt: null },
        include: {
          departments: {
            where: { deletedAt: null },
            select: { id: true, name: true, code: true, isActive: true },
          },
        },
      });

      if (!branch) {
        throw new AppException(ERROR_CODES.NOT_FOUND, 'Branch not found');
      }

      return branch;
    });
  }

  async createBranch(dto: CreateBranchDto) {
    return this.tenantDb.transaction(async (tx) => {
      const companyId = tx.currentCompanyId;
      const code = dto.code.trim().toUpperCase();

      const existing = await tx.branch.findFirst({
        where: { companyId, code, deletedAt: null },
      });
      if (existing) {
        throw new AppException(ERROR_CODES.CONFLICT, `Branch code "${code}" is already in use`);
      }

      if (dto.isHeadOffice) {
        await this.demotePreviousHeadOffice(tx, companyId);
      }

      const branch = await tx.branch.create({
        data: {
          companyId,
          name: dto.name.trim(),
          code,
          address: cleanNullable(dto.address) ?? null,
          phone: cleanNullable(dto.phone) ?? null,
          email: cleanNullable(dto.email) ?? null,
          isHeadOffice: Boolean(dto.isHeadOffice),
          isActive: true,
        },
      });

      await this.auditService.record(tx, {
        action: 'BRANCH_CREATED',
        module: 'company',
        entity: 'branch',
        entityId: branch.id,
        after: {
          name: branch.name,
          code: branch.code,
          isHeadOffice: branch.isHeadOffice,
        },
      });

      return branch;
    });
  }

  async updateBranch(branchId: string, dto: UpdateBranchDto, userId: string) {
    return this.tenantDb.transaction(async (tx) => {
      const companyId = tx.currentCompanyId;
      await this.assertBranchAccess(companyId, userId, branchId, PERMISSIONS.BRANCH_EDIT);

      const existing = await tx.branch.findFirst({
        where: { id: branchId, companyId, deletedAt: null },
      });
      if (!existing) {
        throw new AppException(ERROR_CODES.NOT_FOUND, 'Branch not found');
      }

      if (dto.code) {
        await this.checkCodeConflict(tx, companyId, dto.code, existing.code, branchId);
      }

      if (dto.isHeadOffice === true && !existing.isHeadOffice) {
        await this.demotePreviousHeadOffice(tx, companyId);
      }

      const updateData = {
        name: dto.name ? dto.name.trim() : undefined,
        code: dto.code ? dto.code.trim().toUpperCase() : undefined,
        address: cleanNullable(dto.address),
        phone: cleanNullable(dto.phone),
        email: cleanNullable(dto.email),
        isHeadOffice: dto.isHeadOffice,
        isActive: dto.isActive,
      };

      const updated = await tx.branch.update({
        where: { id: branchId },
        data: updateData,
      });

      await this.recordBranchUpdateAudit(tx, branchId, existing, updated);

      return updated;
    });
  }

  private async checkCodeConflict(
    tx: TenantPrisma,
    companyId: string,
    newCodeRaw: string,
    existingCode: string,
    branchId: string,
  ): Promise<void> {
    const code = newCodeRaw.trim().toUpperCase();
    if (code !== existingCode) {
      await this.assertCodeAvailable(tx, companyId, code, branchId);
    }
  }

  private async recordBranchUpdateAudit(
    tx: TenantPrisma,
    branchId: string,
    before: { name: string; code: string; isHeadOffice: boolean; isActive: boolean },
    after: { name: string; code: string; isHeadOffice: boolean; isActive: boolean },
  ): Promise<void> {
    await this.auditService.record(tx, {
      action: 'BRANCH_UPDATED',
      module: 'company',
      entity: 'branch',
      entityId: branchId,
      before: {
        name: before.name,
        code: before.code,
        isHeadOffice: before.isHeadOffice,
        isActive: before.isActive,
      },
      after: {
        name: after.name,
        code: after.code,
        isHeadOffice: after.isHeadOffice,
        isActive: after.isActive,
      },
    });
  }

  async deleteBranch(branchId: string, userId: string) {
    return this.tenantDb.transaction(async (tx) => {
      const companyId = tx.currentCompanyId;
      await this.assertBranchAccess(companyId, userId, branchId, PERMISSIONS.BRANCH_DELETE);

      const existing = await tx.branch.findFirst({
        where: { id: branchId, companyId, deletedAt: null },
      });
      if (!existing) {
        throw new AppException(ERROR_CODES.NOT_FOUND, 'Branch not found');
      }

      if (existing.isHeadOffice) {
        throw new AppException(
          ERROR_CODES.VALIDATION_ERROR,
          'Cannot delete the Head Office branch. Transfer Head Office to another branch first.',
        );
      }

      await this.assertBranchDeletable(tx, companyId, branchId);

      const deleted = await tx.branch.update({
        where: { id: branchId },
        data: {
          deletedAt: new Date(),
          isActive: false,
        },
      });

      await this.auditService.record(tx, {
        action: 'BRANCH_DELETED',
        module: 'company',
        entity: 'branch',
        entityId: branchId,
        before: {
          name: existing.name,
          code: existing.code,
        },
      });

      return deleted;
    });
  }

  private async assertBranchAccess(
    companyId: string,
    userId: string,
    branchId: string,
    permission: string,
  ): Promise<void> {
    const { scopes, branchIds } = await this.permissionService.resolvePermissions(
      companyId,
      userId,
    );
    const branchScope = scopes[permission];
    if ((branchScope === 'BRANCH' || branchScope === 'OWN') && !branchIds.includes(branchId)) {
      throw new AppException(ERROR_CODES.FORBIDDEN, 'Access to this branch is restricted');
    }
  }

  private async demotePreviousHeadOffice(tx: TenantPrisma, companyId: string): Promise<void> {
    await tx.branch.updateMany({
      where: { companyId, isHeadOffice: true, deletedAt: null },
      data: { isHeadOffice: false },
    });
  }

  private async assertCodeAvailable(
    tx: TenantPrisma,
    companyId: string,
    newCode: string,
    excludeBranchId: string,
  ): Promise<void> {
    const codeConflict = await tx.branch.findFirst({
      where: { companyId, code: newCode, deletedAt: null, id: { not: excludeBranchId } },
    });
    if (codeConflict) {
      throw new AppException(ERROR_CODES.CONFLICT, `Branch code "${newCode}" is already in use`);
    }
  }

  private async assertBranchDeletable(
    tx: TenantPrisma,
    companyId: string,
    branchId: string,
  ): Promise<void> {
    const activeBranchesCount = await tx.branch.count({
      where: { companyId, deletedAt: null },
    });
    if (activeBranchesCount <= 1) {
      throw new AppException(
        ERROR_CODES.VALIDATION_ERROR,
        'Cannot delete the only branch of a company',
      );
    }

    const activeDeptCount = await tx.department.count({
      where: { companyId, branchId, deletedAt: null },
    });
    if (activeDeptCount > 0) {
      throw new AppException(
        ERROR_CODES.VALIDATION_ERROR,
        'Cannot delete branch with active departments. Reassign or delete departments first.',
      );
    }
  }
}
