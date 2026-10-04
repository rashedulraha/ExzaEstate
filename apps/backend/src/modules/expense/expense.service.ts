import { HttpStatus, Injectable } from '@nestjs/common';
import { ERROR_CODES } from '@exzaestate/shared';
import { AppException } from '../../common/exceptions/app.exception.js';
import { TenantDb } from '../../database/tenant-db.service.js';
import type { TenantPrisma } from '../../database/tenant-prisma.js';
import { AuditService } from '../../platform/audit/audit.service.js';
import { SequenceService } from '../../platform/sequence/sequence.service.js';
import { PostingService } from '../accounting/posting/posting.service.js';
import { EXPENSE_STATUS } from './domain/expense.constants.js';
import { ExpenseCategoryService } from './expense-category.service.js';
import { BudgetService } from './budget/budget.service.js';
import { Optional } from '@nestjs/common';
import { loadExpenseThreshold } from './expense-approval.helper.js';
import {
  buildExpensePostingPayload,
  generateExpenseVoucherNumber,
} from './expense-posting.helper.js';
import { fetchProjectExpensesRollup, getVoucherOrThrow } from './expense-query.helper.js';
import {
  approveExpenseVoucher,
  rejectExpenseVoucher,
  submitExpenseVoucher,
  verifyExpenseVoucher,
} from './expense-transitions.helper.js';
import type { CreateExpenseDto, PayExpenseDto, RejectExpenseDto } from './dto/index.js';

@Injectable()
export class ExpenseService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly sequenceService: SequenceService,
    private readonly auditService: AuditService,
    private readonly postingService: PostingService,
    private readonly categoryService: ExpenseCategoryService,
    @Optional() private readonly budgetService?: BudgetService,
  ) {}

  async createVoucher(
    companyId: string,
    userId: string,
    dto: CreateExpenseDto,
    tx?: TenantPrisma,
  ) {
    const runner = async (db: TenantPrisma) => {
      const category = await this.categoryService.getCategoryById(companyId, dto.categoryId, db);
      if (!category.isActive) {
        throw new AppException(
          ERROR_CODES.VALIDATION_ERROR,
          'Cannot create expense against an inactive category',
          { categoryId: dto.categoryId },
          HttpStatus.BAD_REQUEST,
        );
      }

      const amountPaisa = BigInt(dto.amountPaisa);
      if (amountPaisa <= 0n) {
        throw new AppException(
          ERROR_CODES.VALIDATION_ERROR,
          'Expense amount must be greater than zero',
          { amountPaisa: dto.amountPaisa },
          HttpStatus.BAD_REQUEST,
        );
      }

      const thresholdPaisa = await loadExpenseThreshold(db, companyId);
      const requiresMdApproval = amountPaisa > thresholdPaisa;
      const voucherNumber = await generateExpenseVoucherNumber(db, this.sequenceService);

      const voucher = await db.expenseVoucher.create({
        data: {
          companyId,
          voucherNumber,
          categoryId: dto.categoryId,
          projectId: dto.projectId,
          costCenter: dto.costCenter,
          payeeName: dto.payeeName,
          vendorId: dto.vendorId,
          amountPaisa,
          description: dto.description,
          expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : new Date(),
          status: EXPENSE_STATUS.DRAFT,
          requiresMdApproval,
          paymentMethod: dto.paymentMethod ?? 'BANK_TRANSFER',
          paidLater: dto.paidLater ?? false,
          bankAccountId: dto.bankAccountId,
          bankAccountCode: dto.bankAccountCode,
          createdById: userId,
        },
        include: { category: true, attachments: true },
      });

      await this.auditService.record(db, {
        action: 'EXPENSE_VOUCHER_CREATED',
        module: 'expense',
        recordType: 'ExpenseVoucher',
        recordId: voucher.id,
        after: {
          voucherNumber: voucher.voucherNumber,
          amountPaisa: voucher.amountPaisa.toString(),
          requiresMdApproval,
        },
      });

      return voucher;
    };

    return tx ? runner(tx) : this.tenantDb.withCompany(companyId, runner);
  }

  async submitVoucher(companyId: string, userId: string, voucherId: string, tx?: TenantPrisma) {
    const runner = (db: TenantPrisma) =>
      submitExpenseVoucher(db, this.auditService, companyId, userId, voucherId);
    return tx ? runner(tx) : this.tenantDb.withCompany(companyId, runner);
  }

  async approveVoucher(companyId: string, userId: string, voucherId: string, tx?: TenantPrisma) {
    const runner = (db: TenantPrisma) =>
      approveExpenseVoucher(db, this.auditService, companyId, userId, voucherId);
    return tx ? runner(tx) : this.tenantDb.withCompany(companyId, runner);
  }

  async verifyVoucher(companyId: string, userId: string, voucherId: string, tx?: TenantPrisma) {
    const runner = (db: TenantPrisma) =>
      verifyExpenseVoucher(db, this.auditService, companyId, userId, voucherId);
    return tx ? runner(tx) : this.tenantDb.withCompany(companyId, runner);
  }

  async payVoucher(
    companyId: string,
    userId: string,
    voucherId: string,
    dto?: PayExpenseDto,
    tx?: TenantPrisma,
  ) {
    const runner = async (db: TenantPrisma) => {
      const voucher = await getVoucherOrThrow(db, companyId, voucherId);
      if (
        voucher.status !== EXPENSE_STATUS.APPROVED &&
        voucher.status !== EXPENSE_STATUS.VERIFIED
      ) {
        throw new AppException(
          ERROR_CODES.INVALID_STATE_TRANSITION,
          `Only APPROVED or VERIFIED vouchers can be paid (current: ${voucher.status})`,
          { currentStatus: voucher.status },
          HttpStatus.BAD_REQUEST,
        );
      }

      const postingPayload = buildExpensePostingPayload(voucher, dto);
      const journals = await this.postingService.post(
        companyId,
        userId,
        'EXPENSE_APPROVED_PAID',
        postingPayload,
        db,
      );

      const journalId = journals[0]?.id ?? null;
      const updated = await db.expenseVoucher.update({
        where: { id: voucherId },
        data: {
          status: EXPENSE_STATUS.PAID,
          paymentMethod: postingPayload.paymentMethod,
          bankAccountCode: postingPayload.bankAccountCode,
          journalId,
          paidAt: new Date(),
          paidById: userId,
        },
        include: { category: true, attachments: true },
      });

      await this.auditService.record(db, {
        action: 'EXPENSE_VOUCHER_PAID',
        module: 'expense',
        recordType: 'ExpenseVoucher',
        recordId: voucherId,
        after: {
          status: updated.status,
          journalId,
          paidById: userId,
          amountPaisa: updated.amountPaisa.toString(),
        },
      });

      if (this.budgetService) {
        await this.budgetService.recordSpend(
          companyId,
          userId,
          {
            projectId: voucher.projectId,
            categoryId: voucher.categoryId,
            amountPaisa: voucher.amountPaisa,
          },
          db,
        );
      }

      return updated;
    };

    return tx ? runner(tx) : this.tenantDb.withCompany(companyId, runner);
  }

  async rejectVoucher(
    companyId: string,
    userId: string,
    voucherId: string,
    dto: RejectExpenseDto,
    tx?: TenantPrisma,
  ) {
    const runner = (db: TenantPrisma) =>
      rejectExpenseVoucher(db, this.auditService, companyId, userId, voucherId, dto);
    return tx ? runner(tx) : this.tenantDb.withCompany(companyId, runner);
  }

  async getProjectExpensesRollup(companyId: string, projectId: string, tx?: TenantPrisma) {
    const runner = (db: TenantPrisma) => fetchProjectExpensesRollup(db, companyId, projectId);
    return tx ? runner(tx) : this.tenantDb.withCompany(companyId, runner);
  }

  async getVoucherById(companyId: string, voucherId: string, tx?: TenantPrisma) {
    const runner = (db: TenantPrisma) => getVoucherOrThrow(db, companyId, voucherId);
    return tx ? runner(tx) : this.tenantDb.withCompany(companyId, runner);
  }
}
