import { HttpStatus } from '@nestjs/common';
import { ERROR_CODES } from '@exzaestate/shared';
import { AppException } from '../../common/exceptions/app.exception.js';
import type { TenantPrisma } from '../../database/tenant-prisma.js';
import type { AuditService } from '../../platform/audit/audit.service.js';
import { EXPENSE_STATUS } from './domain/expense.constants.js';
import {
  getUserApprovalRoles,
  loadExpenseThreshold,
  validateExpenseApprovalThreshold,
} from './expense-approval.helper.js';
import { getVoucherOrThrow } from './expense-query.helper.js';
import type { RejectExpenseDto } from './dto/index.js';

export async function submitExpenseVoucher(
  db: TenantPrisma,
  auditService: AuditService,
  companyId: string,
  userId: string,
  voucherId: string,
) {
  const voucher = await getVoucherOrThrow(db, companyId, voucherId);
  if (voucher.status !== EXPENSE_STATUS.DRAFT) {
    throw new AppException(
      ERROR_CODES.INVALID_STATE_TRANSITION,
      `Only DRAFT expense vouchers can be submitted (current: ${voucher.status})`,
      { currentStatus: voucher.status },
      HttpStatus.BAD_REQUEST,
    );
  }

  const updated = await db.expenseVoucher.update({
    where: { id: voucherId },
    data: { status: EXPENSE_STATUS.SUBMITTED, submittedAt: new Date() },
    include: { category: true, attachments: true },
  });

  await auditService.record(db, {
    action: 'EXPENSE_VOUCHER_SUBMITTED',
    module: 'expense',
    recordType: 'ExpenseVoucher',
    recordId: voucherId,
    before: { status: voucher.status },
    after: { status: updated.status, submittedById: userId },
  });

  return updated;
}

export async function approveExpenseVoucher(
  db: TenantPrisma,
  auditService: AuditService,
  companyId: string,
  userId: string,
  voucherId: string,
) {
  const voucher = await getVoucherOrThrow(db, companyId, voucherId);
  if (voucher.status !== EXPENSE_STATUS.SUBMITTED) {
    throw new AppException(
      ERROR_CODES.INVALID_STATE_TRANSITION,
      `Only SUBMITTED expense vouchers can be approved (current: ${voucher.status})`,
      { currentStatus: voucher.status },
      HttpStatus.BAD_REQUEST,
    );
  }

  const thresholdPaisa = await loadExpenseThreshold(db, companyId);
  const roles = await getUserApprovalRoles(db, companyId, userId);

  validateExpenseApprovalThreshold(
    voucher.amountPaisa,
    thresholdPaisa,
    roles,
    voucher.createdById,
    userId,
  );

  const updated = await db.expenseVoucher.update({
    where: { id: voucherId },
    data: {
      status: EXPENSE_STATUS.APPROVED,
      approvedById: userId,
      approvedAt: new Date(),
    },
    include: { category: true, attachments: true },
  });

  await auditService.record(db, {
    action: 'EXPENSE_VOUCHER_APPROVED',
    module: 'expense',
    recordType: 'ExpenseVoucher',
    recordId: voucherId,
    before: { status: voucher.status },
    after: { status: updated.status, approvedById: userId },
  });

  return updated;
}

export async function verifyExpenseVoucher(
  db: TenantPrisma,
  auditService: AuditService,
  companyId: string,
  userId: string,
  voucherId: string,
) {
  const voucher = await getVoucherOrThrow(db, companyId, voucherId);
  if (voucher.status !== EXPENSE_STATUS.APPROVED) {
    throw new AppException(
      ERROR_CODES.INVALID_STATE_TRANSITION,
      `Only APPROVED expense vouchers can be verified by accounts (current: ${voucher.status})`,
      { currentStatus: voucher.status },
      HttpStatus.BAD_REQUEST,
    );
  }

  const updated = await db.expenseVoucher.update({
    where: { id: voucherId },
    data: { status: EXPENSE_STATUS.VERIFIED, verifiedById: userId, verifiedAt: new Date() },
    include: { category: true, attachments: true },
  });

  await auditService.record(db, {
    action: 'EXPENSE_VOUCHER_VERIFIED',
    module: 'expense',
    recordType: 'ExpenseVoucher',
    recordId: voucherId,
    before: { status: voucher.status },
    after: { status: updated.status, verifiedById: userId },
  });

  return updated;
}

export async function rejectExpenseVoucher(
  db: TenantPrisma,
  auditService: AuditService,
  companyId: string,
  userId: string,
  voucherId: string,
  dto: RejectExpenseDto,
) {
  const voucher = await getVoucherOrThrow(db, companyId, voucherId);
  if (
    voucher.status !== EXPENSE_STATUS.SUBMITTED &&
    voucher.status !== EXPENSE_STATUS.APPROVED
  ) {
    throw new AppException(
      ERROR_CODES.INVALID_STATE_TRANSITION,
      `Cannot reject voucher in status: ${voucher.status}`,
      { currentStatus: voucher.status },
      HttpStatus.BAD_REQUEST,
    );
  }

  const updated = await db.expenseVoucher.update({
    where: { id: voucherId },
    data: {
      status: EXPENSE_STATUS.REJECTED,
      rejectedAt: new Date(),
      rejectionReason: dto.reason ?? 'Rejected by reviewer',
    },
  });

  await auditService.record(db, {
    action: 'EXPENSE_VOUCHER_REJECTED',
    module: 'expense',
    recordType: 'ExpenseVoucher',
    recordId: voucherId,
    after: { status: updated.status, rejectedById: userId, reason: dto.reason },
  });

  return updated;
}
