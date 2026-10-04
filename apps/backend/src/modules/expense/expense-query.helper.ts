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
