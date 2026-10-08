import { HttpStatus } from '@nestjs/common';
import { ERROR_CODES } from '@exzaestate/shared';
import { AppException } from '../../common/exceptions/app.exception.js';
import type { TenantPrisma } from '../../database/tenant-prisma.js';
import { EXPENSE_STATUS } from './domain/expense.constants.js';

export async function getVoucherOrThrow(db: TenantPrisma, companyId: string, voucherId: string) {
  const voucher = await db.expenseVoucher.findFirst({
    where: { id: voucherId, companyId, deletedAt: null },
    include: { category: true, attachments: true },
  });

  if (!voucher) {
    throw new AppException(
      ERROR_CODES.NOT_FOUND,
      `Expense voucher not found: ${voucherId}`,
      { voucherId },
      HttpStatus.NOT_FOUND,
    );
  }

  return voucher;
}

export async function fetchProjectExpensesRollup(
  db: TenantPrisma,
  companyId: string,
  projectId: string,
) {
  const vouchers = await db.expenseVoucher.findMany({
    where: {
      companyId,
      projectId,
      status: EXPENSE_STATUS.PAID,
      deletedAt: null,
    },
  });

  const totalPaidExpensePaisa = vouchers.reduce((sum, v) => sum + v.amountPaisa, 0n);
  return { projectId, totalPaidExpensePaisa, voucherCount: vouchers.length };
}

export interface ListExpenseVouchersQuery {
  status?: string;
  projectId?: string;
  categoryId?: string;
  limit?: number;
  offset?: number;
}

function buildExpenseWhereClause(companyId: string, query?: ListExpenseVouchersQuery) {
  const where: Record<string, unknown> = {
    companyId,
    deletedAt: null,
  };
  if (query?.status && query.status !== 'ALL') {
    where.status = query.status;
  }
  if (query?.projectId) {
    where.projectId = query.projectId;
  }
  if (query?.categoryId) {
    where.categoryId = query.categoryId;
  }
  return where;
}

interface RawVoucherItem {
  id: string;
  voucherNumber: string;
  categoryId: string;
  category?: { name: string } | null;
  projectId: string | null;
  costCenter: string | null;
  payeeName: string;
  vendorId: string | null;
  amountPaisa: bigint;
  description: string;
  status: string;
  expenseDate: Date | null;
  paymentMethod: string | null;
  paidLater: boolean;
  bankAccountId: string | null;
  bankAccountCode: string | null;
  createdById: string | null;
  submittedAt: Date | null;
  verifiedAt: Date | null;
  approvedAt: Date | null;
  paidAt: Date | null;
  rejectionReason: string | null;
}

function formatVoucherItem(v: RawVoucherItem, projectMap: Map<string, string>) {
  return {
    id: v.id,
    voucherNumber: v.voucherNumber,
    categoryId: v.categoryId,
    categoryName: v.category?.name,
    projectId: v.projectId,
    projectName: v.projectId ? (projectMap.get(v.projectId) ?? null) : null,
    costCenter: v.costCenter,
    payeeName: v.payeeName,
    vendorId: v.vendorId,
    amountPaisa: v.amountPaisa.toString(),
    description: v.description,
    status: v.status,
    expenseDate: v.expenseDate ? v.expenseDate.toISOString().slice(0, 10) : '',
    paymentMethod: v.paymentMethod,
    paidLater: v.paidLater,
    bankAccountId: v.bankAccountId,
    bankAccountCode: v.bankAccountCode,
    createdById: v.createdById,
    submittedAt: v.submittedAt ? v.submittedAt.toISOString() : null,
    verifiedAt: v.verifiedAt ? v.verifiedAt.toISOString() : null,
    approvedAt: v.approvedAt ? v.approvedAt.toISOString() : null,
    paidAt: v.paidAt ? v.paidAt.toISOString() : null,
    rejectionReason: v.rejectionReason,
  };
}

export async function fetchExpenseVouchers(
  db: TenantPrisma,
  companyId: string,
  query?: ListExpenseVouchersQuery,
) {
  const where = buildExpenseWhereClause(companyId, query);
  const take = query?.limit ? Number(query.limit) : 100;
  const skip = query?.offset ? Number(query.offset) : 0;

  const [items, total] = await Promise.all([
    db.expenseVoucher.findMany({
      where,
      include: { category: true, attachments: true },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    }),
    db.expenseVoucher.count({ where }),
  ]);

  const rawProjectIds = items.map((v) => v.projectId).filter((id): id is string => Boolean(id));
  const uniqueProjectIds = Array.from(new Set(rawProjectIds));

  const projects =
    uniqueProjectIds.length > 0
      ? await db.project.findMany({
          where: { id: { in: uniqueProjectIds }, companyId },
          select: { id: true, name: true },
        })
      : [];

  const projectMap = new Map(projects.map((p) => [p.id, p.name]));
  const mappedItems = items.map((v) => formatVoucherItem(v, projectMap));

  return { items: mappedItems, total };
}
