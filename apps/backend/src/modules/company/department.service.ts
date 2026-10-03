import { Injectable } from '@nestjs/common';
import { ERROR_CODES } from '@exzaestate/shared';
import { AppException } from '../../common/exceptions/app.exception.js';
import { TenantDb } from '../../database/tenant-db.service.js';
import type { TenantPrisma } from '../../database/tenant-prisma.js';
import { AuditService } from '../../platform/audit/audit.service.js';
import {
  CreateDepartmentDto,
  QueryDepartmentDto,
  UpdateDepartmentDto,
} from './dto/department.dto.js';

@Injectable()
export class DepartmentService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly auditService: AuditService,
  ) {}

  async listDepartments(query?: QueryDepartmentDto) {
    return this.tenantDb.transaction(async (tx) => {
      const companyId = tx.currentCompanyId;

      return tx.department.findMany({
        where: {
          companyId,
          deletedAt: null,
          ...(query?.branchId ? { branchId: query.branchId } : {}),
        },
        include: {
          branch: {
            select: { id: true, name: true, code: true },
          },
        },
        orderBy: { name: 'asc' },
      });
    });
  }

  async getDepartment(departmentId: string) {
    return this.tenantDb.transaction(async (tx) => {
      const companyId = tx.currentCompanyId;
      const dept = await tx.department.findFirst({
        where: { id: departmentId, companyId, deletedAt: null },
        include: {
          branch: {
            select: { id: true, name: true, code: true },
          },
        },
      });

      if (!dept) {
        throw new AppException(ERROR_CODES.NOT_FOUND, 'Department not found');
      }

      return dept;
    });
  }

  async createDepartment(dto: CreateDepartmentDto) {
    return this.tenantDb.transaction(async (tx) => {
      const companyId = tx.currentCompanyId;
      const code = dto.code.trim().toUpperCase();

      const existing = await tx.department.findFirst({
        where: { companyId, code, deletedAt: null },
      });
      if (existing) {
        throw new AppException(ERROR_CODES.CONFLICT, `Department code "${code}" is already in use`);
      }

      if (dto.branchId) {
        await this.assertBranchExists(tx, companyId, dto.branchId);
      }

      const dept = await tx.department.create({
        data: {
          companyId,
          branchId: dto.branchId ?? null,
          name: dto.name.trim(),
          code,
          isActive: true,
        },
        include: {
          branch: {
            select: { id: true, name: true, code: true },
          },
        },
      });

      await this.auditService.record(tx, {
        action: 'DEPARTMENT_CREATED',
        module: 'company',
        entity: 'department',
        entityId: dept.id,
        after: {
          name: dept.name,
          code: dept.code,
          branchId: dept.branchId,
        },
      });

      return dept;
    });
  }

  async updateDepartment(departmentId: string, dto: UpdateDepartmentDto) {
    return this.tenantDb.transaction(async (tx) => {
      const companyId = tx.currentCompanyId;
      const existing = await tx.department.findFirst({
        where: { id: departmentId, companyId, deletedAt: null },
      });

      if (!existing) {
        throw new AppException(ERROR_CODES.NOT_FOUND, 'Department not found');
      }

      if (dto.code && dto.code.trim().toUpperCase() !== existing.code) {
        await this.assertDepartmentCodeAvailable(
          tx,
          companyId,
          dto.code.trim().toUpperCase(),
          departmentId,
        );
      }

      if (dto.branchId) {
        await this.assertBranchExists(tx, companyId, dto.branchId);
      }

      const updated = await tx.department.update({
        where: { id: departmentId },
        data: {
          name: dto.name?.trim(),
          code: dto.code?.trim().toUpperCase(),
          branchId: dto.branchId !== undefined ? dto.branchId : undefined,
          isActive: dto.isActive,
        },
        include: {
          branch: {
            select: { id: true, name: true, code: true },
          },
        },
      });

      await this.auditService.record(tx, {
        action: 'DEPARTMENT_UPDATED',
        module: 'company',
        entity: 'department',
        entityId: departmentId,
        before: {
          name: existing.name,
          code: existing.code,
          branchId: existing.branchId,
          isActive: existing.isActive,
        },
        after: {
          name: updated.name,
          code: updated.code,
          branchId: updated.branchId,
          isActive: updated.isActive,
        },
      });

      return updated;
    });
  }

  async deleteDepartment(departmentId: string) {
    return this.tenantDb.transaction(async (tx) => {
      const companyId = tx.currentCompanyId;
      const existing = await tx.department.findFirst({
        where: { id: departmentId, companyId, deletedAt: null },
      });

      if (!existing) {
        throw new AppException(ERROR_CODES.NOT_FOUND, 'Department not found');
      }

      const deleted = await tx.department.update({
        where: { id: departmentId },
        data: {
          deletedAt: new Date(),
          isActive: false,
        },
      });

      await this.auditService.record(tx, {
        action: 'DEPARTMENT_DELETED',
        module: 'company',
        entity: 'department',
        entityId: departmentId,
        before: {
          name: existing.name,
          code: existing.code,
        },
      });

      return deleted;
    });
  }

  private async assertBranchExists(
    tx: TenantPrisma,
    companyId: string,
    branchId: string,
  ): Promise<void> {
    const branch = await tx.branch.findFirst({
      where: { id: branchId, companyId, deletedAt: null },
    });
    if (!branch) {
      throw new AppException(ERROR_CODES.NOT_FOUND, 'Target branch not found');
    }
  }

  private async assertDepartmentCodeAvailable(
    tx: TenantPrisma,
    companyId: string,
    code: string,
    excludeDeptId: string,
  ): Promise<void> {
    const codeConflict = await tx.department.findFirst({
      where: { companyId, code, deletedAt: null, id: { not: excludeDeptId } },
    });
    if (codeConflict) {
      throw new AppException(ERROR_CODES.CONFLICT, `Department code "${code}" is already in use`);
    }
  }
}
