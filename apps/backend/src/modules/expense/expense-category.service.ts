import { HttpStatus, Injectable } from '@nestjs/common';
import { ERROR_CODES } from '@exzaestate/shared';
import { AppException } from '../../common/exceptions/app.exception.js';
import { TenantDb } from '../../database/tenant-db.service.js';
import type { TenantPrisma } from '../../database/tenant-prisma.js';
import { AuditService } from '../../platform/audit/audit.service.js';
import type { CreateCategoryDto } from './dto/create-category.dto.js';

@Injectable()
export class ExpenseCategoryService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly auditService: AuditService,
  ) {}

  async createCategory(
    companyId: string,
    userId: string,
    dto: CreateCategoryDto,
    tx?: TenantPrisma,
  ) {
    const runner = async (db: TenantPrisma) => {
      const existing = await db.expenseCategory.findUnique({
        where: { companyId_code: { companyId, code: dto.code } },
      });

      if (existing) {
        throw new AppException(
          ERROR_CODES.CONFLICT,
          `Expense category with code ${dto.code} already exists`,
          { code: dto.code },
          HttpStatus.CONFLICT,
        );
      }

      const category = await db.expenseCategory.create({
        data: {
          companyId,
          code: dto.code,
          name: dto.name,
          accountCode: dto.accountCode ?? '5500',
          description: dto.description,
          isActive: dto.isActive ?? true,
        },
      });

      await this.auditService.record(db, {
        action: 'EXPENSE_CATEGORY_CREATED',
        module: 'expense',
        recordType: 'ExpenseCategory',
        recordId: category.id,
        after: {
          code: category.code,
          name: category.name,
          accountCode: category.accountCode,
          createdById: userId,
        },
      });

      return category;
    };

    return tx ? runner(tx) : this.tenantDb.withCompany(companyId, runner);
  }

  async listCategories(companyId: string, activeOnly = true) {
    return this.tenantDb.withCompany(companyId, async (db) => {
      return db.expenseCategory.findMany({
        where: {
          companyId,
          deletedAt: null,
          ...(activeOnly ? { isActive: true } : {}),
        },
        orderBy: { name: 'asc' },
      });
    });
  }

  async getCategoryById(companyId: string, categoryId: string, tx?: TenantPrisma) {
    const runner = async (db: TenantPrisma) => {
      const category = await db.expenseCategory.findFirst({
        where: { id: categoryId, companyId, deletedAt: null },
      });

      if (!category) {
        throw new AppException(
          ERROR_CODES.NOT_FOUND,
          `Expense category not found: ${categoryId}`,
          { categoryId },
          HttpStatus.NOT_FOUND,
        );
      }

      return category;
    };

    return tx ? runner(tx) : this.tenantDb.withCompany(companyId, runner);
  }
}
