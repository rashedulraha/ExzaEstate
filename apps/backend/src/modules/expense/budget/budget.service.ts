import { HttpStatus, Injectable } from '@nestjs/common';
import { ERROR_CODES } from '@exzaestate/shared';
import { AppException } from '../../../common/exceptions/app.exception.js';
import { TenantDb } from '../../../database/tenant-db.service.js';
import type { TenantPrisma } from '../../../database/tenant-prisma.js';
import { AuditService } from '../../../platform/audit/audit.service.js';
import { OutboxService } from '../../../platform/outbox/outbox.service.js';
import { evaluateBudgetThresholds } from './domain/budget-alert.engine.js';
import type { BudgetQueryDto, CreateBudgetDto } from './dto/index.js';

@Injectable()
export class BudgetService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly auditService: AuditService,
    private readonly outboxService: OutboxService,
  ) {}

  async createBudget(
    companyId: string,
    userId: string,
    dto: CreateBudgetDto,
    tx?: TenantPrisma,
  ) {
    const runner = async (db: TenantPrisma) => {
      const budgetAmountPaisa = BigInt(dto.budgetAmountPaisa);
      if (budgetAmountPaisa <= 0n) {
        throw new AppException(
          ERROR_CODES.VALIDATION_ERROR,
          'Budget amount must be greater than zero',
          { budgetAmountPaisa: dto.budgetAmountPaisa },
          HttpStatus.BAD_REQUEST,
        );
      }

      const budget = await db.expenseBudget.create({
        data: {
          companyId,
          projectId: dto.projectId,
          categoryId: dto.categoryId,
          fiscalYear: dto.fiscalYear,
          budgetAmountPaisa,
        },
        include: { category: true },
      });

      await this.auditService.record(db, {
        action: 'EXPENSE_BUDGET_CREATED',
        module: 'expense',
        recordType: 'ExpenseBudget',
        recordId: budget.id,
        after: {
          fiscalYear: budget.fiscalYear,
          budgetAmountPaisa: budget.budgetAmountPaisa.toString(),
          projectId: budget.projectId,
          categoryId: budget.categoryId,
          createdById: userId,
        },
      });

      return budget;
    };

    return tx ? runner(tx) : this.tenantDb.withCompany(companyId, runner);
  }

  async listBudgets(companyId: string, query?: BudgetQueryDto, tx?: TenantPrisma) {
    const runner = async (db: TenantPrisma) => {
      const budgets = await db.expenseBudget.findMany({
        where: {
          companyId,
          deletedAt: null,
          ...(query?.fiscalYear ? { fiscalYear: query.fiscalYear } : {}),
          ...(query?.projectId ? { projectId: query.projectId } : {}),
          ...(query?.categoryId ? { categoryId: query.categoryId } : {}),
        },
        include: { category: true },
        orderBy: { createdAt: 'desc' },
      });

      return budgets.map((b) => {
        const remainingPaisa =
          b.budgetAmountPaisa > b.actualSpendPaisa
            ? b.budgetAmountPaisa - b.actualSpendPaisa
            : 0n;
        const spendPercentage =
          b.budgetAmountPaisa > 0n
            ? Number((b.actualSpendPaisa * 10000n) / b.budgetAmountPaisa) / 100
            : 0;

        return {
          ...b,
          remainingPaisa,
          spendPercentage,
        };
      });
    };

    return tx ? runner(tx) : this.tenantDb.withCompany(companyId, runner);
  }

  async recordSpend(
    companyId: string,
    userId: string,
    params: {
      projectId?: string | null;
      categoryId?: string | null;
      amountPaisa: bigint;
    },
    tx: TenantPrisma,
  ) {
    if (params.amountPaisa <= 0n) return;

    // Find budgets matching project, category, or general
    const whereConditions: import('@prisma/client').Prisma.ExpenseBudgetWhereInput[] = [];

    if (params.projectId && params.categoryId) {
      whereConditions.push({ projectId: params.projectId, categoryId: params.categoryId });
    }
    if (params.projectId) {
      whereConditions.push({ projectId: params.projectId, categoryId: null });
    }
    if (params.categoryId) {
      whereConditions.push({ projectId: null, categoryId: params.categoryId });
    }

    if (whereConditions.length === 0) return;

    const matchingBudgets = await tx.expenseBudget.findMany({
      where: {
        companyId,
        deletedAt: null,
        OR: whereConditions,
      },
    });

    for (const budget of matchingBudgets) {
      const newSpend = budget.actualSpendPaisa + params.amountPaisa;

      const evalResult = evaluateBudgetThresholds(
        budget.budgetAmountPaisa,
        newSpend,
        {
          alert70Sent: budget.alert70Sent,
          alert85Sent: budget.alert85Sent,
          alert100Sent: budget.alert100Sent,
        },
        `Budget (${budget.fiscalYear})`,
      );

      // Trigger outbox event for any threshold reached
      for (const alert of evalResult.alertsToTrigger) {
        await this.outboxService.emit(tx, 'expense.budget.alert', {
          budgetId: budget.id,
          companyId,
          fiscalYear: budget.fiscalYear,
          projectId: budget.projectId,
          categoryId: budget.categoryId,
          level: alert.level,
          thresholdPercent: alert.thresholdPercent,
          spendPercentage: evalResult.spendPercentage,
          budgetAmountPaisa: budget.budgetAmountPaisa.toString(),
          actualSpendPaisa: newSpend.toString(),
          message: alert.message,
          triggeredById: userId,
        });

        await this.auditService.record(tx, {
          action: `BUDGET_ALERT_${alert.level}`,
          module: 'expense',
          recordType: 'ExpenseBudget',
          recordId: budget.id,
          after: {
            level: alert.level,
            thresholdPercent: alert.thresholdPercent,
            spendPercentage: evalResult.spendPercentage,
          },
        });
      }

      await tx.expenseBudget.update({
        where: { id: budget.id },
        data: {
          actualSpendPaisa: newSpend,
          alert70Sent: evalResult.nextState.alert70Sent,
          alert85Sent: evalResult.nextState.alert85Sent,
          alert100Sent: evalResult.nextState.alert100Sent,
        },
      });
    }
  }
}
