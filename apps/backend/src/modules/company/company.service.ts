import { Injectable } from '@nestjs/common';
import { ERROR_CODES } from '@exzaestate/shared';
import { AppException } from '../../common/exceptions/app.exception.js';
import { TenantDb } from '../../database/tenant-db.service.js';
import { AuditService } from '../../platform/audit/audit.service.js';
import { BranchService } from './branch.service.js';
import { DepartmentService } from './department.service.js';
import { UpdateCompanyProfileDto } from './dto/company-profile.dto.js';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto.js';
import {
  CreateDepartmentDto,
  QueryDepartmentDto,
  UpdateDepartmentDto,
} from './dto/department.dto.js';

function trimIfDefined(val: string | undefined): string | undefined {
  return val !== undefined ? val.trim() : undefined;
}

@Injectable()
export class CompanyService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly auditService: AuditService,
    private readonly branchService: BranchService,
    private readonly departmentService: DepartmentService,
  ) {}

  // ---------------------------------------------------------------------------
  // Company Profile
  // ---------------------------------------------------------------------------

  async getProfile() {
    return this.tenantDb.transaction(async (tx) => {
      const companyId = tx.currentCompanyId;
      const company = await tx.company.findFirst({
        where: { id: companyId, deletedAt: null },
        select: {
          id: true,
          name: true,
          code: true,
          timezone: true,
          logoUrl: true,
          address: true,
          contactPhone: true,
          contactEmail: true,
          taxNumber: true,
          binNumber: true,
          receiptFooter: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!company) {
        throw new AppException(ERROR_CODES.NOT_FOUND, 'Company not found or inactive');
      }

      return company;
    });
  }

  async updateProfile(dto: UpdateCompanyProfileDto) {
    return this.tenantDb.transaction(async (tx) => {
      const companyId = tx.currentCompanyId;
      const existing = await tx.company.findFirst({
        where: { id: companyId, deletedAt: null },
      });

      if (!existing) {
        throw new AppException(ERROR_CODES.NOT_FOUND, 'Company not found');
      }

      const updatePayload = {
        name: trimIfDefined(dto.name),
        timezone: trimIfDefined(dto.timezone),
        logoUrl: trimIfDefined(dto.logoUrl),
        address: trimIfDefined(dto.address),
        contactPhone: trimIfDefined(dto.contactPhone),
        contactEmail: trimIfDefined(dto.contactEmail),
        taxNumber: trimIfDefined(dto.taxNumber),
        binNumber: trimIfDefined(dto.binNumber),
        receiptFooter: trimIfDefined(dto.receiptFooter),
      };

      const updated = await tx.company.update({
        where: { id: companyId },
        data: updatePayload,
      });

      await this.auditService.record(tx, {
        action: 'COMPANY_UPDATED',
        module: 'company',
        entity: 'company',
        entityId: companyId,
        before: {
          name: existing.name,
          timezone: existing.timezone,
          logoUrl: existing.logoUrl,
          address: existing.address,
          contactPhone: existing.contactPhone,
          contactEmail: existing.contactEmail,
          taxNumber: existing.taxNumber,
          binNumber: existing.binNumber,
          receiptFooter: existing.receiptFooter,
        },
        after: {
          name: updated.name,
          timezone: updated.timezone,
          logoUrl: updated.logoUrl,
          address: updated.address,
          contactPhone: updated.contactPhone,
          contactEmail: updated.contactEmail,
          taxNumber: updated.taxNumber,
          binNumber: updated.binNumber,
          receiptFooter: updated.receiptFooter,
        },
      });

      return updated;
    });
  }

  // ---------------------------------------------------------------------------
  // Branch Delegation
  // ---------------------------------------------------------------------------

  async listBranches(userId: string) {
    return this.branchService.listBranches(userId);
  }

  async getBranch(branchId: string, userId: string) {
    return this.branchService.getBranch(branchId, userId);
  }

  async createBranch(dto: CreateBranchDto) {
    return this.branchService.createBranch(dto);
  }

  async updateBranch(branchId: string, dto: UpdateBranchDto, userId: string) {
    return this.branchService.updateBranch(branchId, dto, userId);
  }

  async deleteBranch(branchId: string, userId: string) {
    return this.branchService.deleteBranch(branchId, userId);
  }

  // ---------------------------------------------------------------------------
  // Department Delegation
  // ---------------------------------------------------------------------------

  async listDepartments(query?: QueryDepartmentDto) {
    return this.departmentService.listDepartments(query);
  }

  async getDepartment(departmentId: string) {
    return this.departmentService.getDepartment(departmentId);
  }

  async createDepartment(dto: CreateDepartmentDto) {
    return this.departmentService.createDepartment(dto);
  }

  async updateDepartment(departmentId: string, dto: UpdateDepartmentDto) {
    return this.departmentService.updateDepartment(departmentId, dto);
  }

  async deleteDepartment(departmentId: string) {
    return this.departmentService.deleteDepartment(departmentId);
  }
}
