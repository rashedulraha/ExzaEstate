import { HttpStatus } from '@nestjs/common';
import { ERROR_CODES } from '@exzaestate/shared';
import { AppException } from '../../common/exceptions/app.exception.js';
import type { TenantPrisma } from '../../database/tenant-prisma.js';
import { DEFAULT_EXPENSE_MD_THRESHOLD_PAISA } from './domain/expense.constants.js';

export async function loadExpenseThreshold(tx: TenantPrisma, companyId: string): Promise<bigint> {
  const setting = await tx.companySetting.findUnique({
    where: { companyId_key: { companyId, key: 'expense_md_threshold' } },
  });

  if (!setting?.value) {
    return DEFAULT_EXPENSE_MD_THRESHOLD_PAISA;
  }

  try {
    const rawVal = typeof setting.value === 'string' ? setting.value : String(setting.value);
    return BigInt(rawVal);
  } catch {
    return DEFAULT_EXPENSE_MD_THRESHOLD_PAISA;
  }
}

export interface UserRoleCheckResult {
  isMd: boolean;
  isGm: boolean;
}

export async function getUserApprovalRoles(
  tx: TenantPrisma,
  companyId: string,
  userId: string,
): Promise<UserRoleCheckResult> {
  const userRoles = await tx.userRole.findMany({
    where: { companyId, userId },
    include: { role: { select: { code: true } } },
  });

  const codes = new Set(userRoles.map((ur) => ur.role.code));
  const isMd = codes.has('MANAGING_DIRECTOR') || codes.has('SUPER_ADMIN');
  const isGm = codes.has('GENERAL_MANAGER');

  return { isMd, isGm };
}

export function validateExpenseApprovalThreshold(
  amountPaisa: bigint,
  thresholdPaisa: bigint,
  roles: UserRoleCheckResult,
  createdById?: string | null,
  approverId?: string,
): void {
  // Self-approval prevention
  if (createdById && approverId && createdById === approverId && !roles.isMd) {
    throw new AppException(
      ERROR_CODES.SELF_APPROVAL_FORBIDDEN,
      'Self-approval is forbidden: creator cannot approve their own expense voucher',
      { approverId, createdById },
      HttpStatus.FORBIDDEN,
    );
  }

  const exceedsMdThreshold = amountPaisa > thresholdPaisa;

  if (exceedsMdThreshold) {
    if (!roles.isMd) {
      throw new AppException(
        ERROR_CODES.APPROVAL_REQUIRED,
        `Expense amount exceeds ৳5,00,000 threshold and strictly requires Managing Director (MD) approval`,
        {
          amountPaisa: amountPaisa.toString(),
          thresholdPaisa: thresholdPaisa.toString(),
        },
        HttpStatus.FORBIDDEN,
      );
    }
  } else {
    if (!roles.isMd && !roles.isGm) {
      throw new AppException(
        ERROR_CODES.APPROVAL_REQUIRED,
        'Expense approval requires either General Manager or Managing Director role',
        {},
        HttpStatus.FORBIDDEN,
      );
    }
  }
}
