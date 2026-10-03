import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { ERROR_CODES } from '@exzaestate/shared';
import { TenantDb } from '../../database/tenant-db.service.js';
import type { TenantPrisma } from '../../database/tenant-prisma.js';
import { PermissionService } from '../auth/permission.service.js';
import type {
  CreateEmployeeDto,
  QueryEmployeesDto,
  UpdateEmployeeDto,
} from './dto/employee.dto.js';
import { buildEmployeeUpdateData, validateSupervisorHierarchy } from './employee-hierarchy.util.js';

export interface EmployeeListItem {
  id: string;
  userId: string;
  employeeCode: string;
  designation: string;
  departmentId: string | null;
  branchId: string | null;
  supervisorId: string | null;
  joiningDate: Date | null;
  phone: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    fullName: string;
    email: string;
  };
}

@Injectable()
export class EmployeeService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly permissionService: PermissionService,
  ) {}

  async createEmployee(companyId: string, dto: CreateEmployeeDto): Promise<EmployeeListItem> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      await this.validateCreatePreconditions(tx, companyId, dto);

      const employee = await tx.employee.create({
        data: {
          companyId,
          userId: dto.userId,
          employeeCode: dto.employeeCode,
          designation: dto.designation,
          branchId: dto.branchId ?? null,
          departmentId: dto.departmentId ?? null,
          supervisorId: dto.supervisorId ?? null,
          joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : null,
          phone: dto.phone ?? null,
        },
        include: {
          user: {
            select: { id: true, fullName: true, email: true },
          },
        },
      });

      await this.permissionService.invalidateCompanyPermissions(companyId);

      return employee;
    });
  }

  async updateEmployee(
    companyId: string,
    employeeId: string,
    dto: UpdateEmployeeDto,
  ): Promise<EmployeeListItem> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const existing = await tx.employee.findUnique({
        where: { id: employeeId, companyId, deletedAt: null },
      });

      if (!existing) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: 'Employee not found',
        });
      }

      await this.validateUpdatePreconditions(tx, companyId, employeeId, existing.employeeCode, dto);

      const updateData = buildEmployeeUpdateData(dto);

      const updated = await tx.employee.update({
        where: { id: employeeId, companyId },
        data: updateData,
        include: {
          user: {
            select: { id: true, fullName: true, email: true },
          },
        },
      });

      if (dto.supervisorId !== undefined || dto.isActive !== undefined) {
        await this.permissionService.invalidateCompanyPermissions(companyId);
      }

      return updated;
    });
  }

  async getEmployeeById(companyId: string, employeeId: string): Promise<EmployeeListItem> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const employee = await tx.employee.findUnique({
        where: { id: employeeId, companyId, deletedAt: null },
        include: {
          user: {
            select: { id: true, fullName: true, email: true },
          },
        },
      });

      if (!employee) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: 'Employee not found',
        });
      }

      return employee;
    });
  }

  async listEmployees(
    companyId: string,
    query: QueryEmployeesDto,
  ): Promise<{ items: EmployeeListItem[]; total: number; page: number; limit: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    return this.tenantDb.withCompany(companyId, async (tx) => {
      const where: Prisma.EmployeeWhereInput = {
        companyId,
        deletedAt: null,
        ...(query.branchId && { branchId: query.branchId }),
        ...(query.departmentId && { departmentId: query.departmentId }),
        ...(query.supervisorId && { supervisorId: query.supervisorId }),
        ...(query.search && {
          OR: [
            { employeeCode: { contains: query.search, mode: 'insensitive' } },
            { designation: { contains: query.search, mode: 'insensitive' } },
            { user: { fullName: { contains: query.search, mode: 'insensitive' } } },
          ],
        }),
      };

      const [items, total] = await Promise.all([
        tx.employee.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: { id: true, fullName: true, email: true },
            },
          },
        }),
        tx.employee.count({ where }),
      ]);

      return { items, total, page, limit };
    });
  }

  async deleteEmployee(companyId: string, employeeId: string): Promise<void> {
    await this.tenantDb.withCompany(companyId, async (tx) => {
      const existing = await tx.employee.findUnique({
        where: { id: employeeId, companyId, deletedAt: null },
      });

      if (!existing) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: 'Employee not found',
        });
      }

      await tx.employee.update({
        where: { id: employeeId, companyId },
        data: { deletedAt: new Date(), isActive: false },
      });

      await this.permissionService.invalidateCompanyPermissions(companyId);
    });
  }

  private async validateCreatePreconditions(
    tx: TenantPrisma,
    companyId: string,
    dto: CreateEmployeeDto,
  ): Promise<void> {
    const user = await tx.user.findUnique({
      where: { id: dto.userId, companyId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException({
        code: ERROR_CODES.NOT_FOUND,
        message: 'User not found in this company',
      });
    }

    const existingEmployee = await tx.employee.findUnique({
      where: { userId: dto.userId },
    });

    if (existingEmployee) {
      throw new ConflictException({
        code: ERROR_CODES.CONFLICT,
        message: 'An employee profile already exists for this user',
      });
    }

    const codeConflict = await tx.employee.findUnique({
      where: { companyId_employeeCode: { companyId, employeeCode: dto.employeeCode } },
    });

    if (codeConflict) {
      throw new ConflictException({
        code: ERROR_CODES.CONFLICT,
        message: `Employee code ${dto.employeeCode} already exists`,
      });
    }

    if (dto.supervisorId) {
      const supervisor = await tx.employee.findUnique({
        where: { id: dto.supervisorId, companyId, deletedAt: null },
      });

      if (!supervisor) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: 'Supervisor employee not found',
        });
      }
    }
  }

  private async validateUpdatePreconditions(
    tx: TenantPrisma,
    companyId: string,
    employeeId: string,
    currentEmployeeCode: string,
    dto: UpdateEmployeeDto,
  ): Promise<void> {
    if (dto.employeeCode && dto.employeeCode !== currentEmployeeCode) {
      const codeConflict = await tx.employee.findUnique({
        where: { companyId_employeeCode: { companyId, employeeCode: dto.employeeCode } },
      });
      if (codeConflict) {
        throw new ConflictException({
          code: ERROR_CODES.CONFLICT,
          message: `Employee code ${dto.employeeCode} already exists`,
        });
      }
    }

    if (dto.supervisorId !== undefined && dto.supervisorId !== null) {
      await validateSupervisorHierarchy(tx, companyId, employeeId, dto.supervisorId);
    }
  }
}
