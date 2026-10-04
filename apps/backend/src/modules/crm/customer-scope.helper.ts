import { ForbiddenException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { type DataScope, ERROR_CODES } from '@exzaestate/shared';

export interface CustomerScopeContext {
  userId: string;
  scope: DataScope;
  teamUserIds?: string[];
  branchIds?: string[];
}

function isCustomerBranchAllowed(
  customerBranchId: string | null | undefined,
  branchIds: string[],
): boolean {
  return Boolean(customerBranchId && branchIds.includes(customerBranchId));
}

function isCustomerUserAllowed(
  customer: { assignedToId?: string | null; createdById?: string | null },
  allowedUsers: string[],
): boolean {
  if (customer.assignedToId && allowedUsers.includes(customer.assignedToId)) {
    return true;
  }
  return Boolean(customer.createdById && allowedUsers.includes(customer.createdById));
}

export function enforceCustomerScope(
  customer: {
    assignedToId?: string | null;
    createdById?: string | null;
    branchId?: string | null;
  },
  context: CustomerScopeContext,
): void {
  const { userId, scope, teamUserIds = [], branchIds = [] } = context;

  if (scope === 'ALL') {
    return;
  }

  if (scope === 'BRANCH') {
    if (!isCustomerBranchAllowed(customer.branchId, branchIds)) {
      throw new ForbiddenException({
        code: ERROR_CODES.FORBIDDEN,
        message: 'Access denied: customer does not belong to your assigned branch',
      });
    }
    return;
  }

  const allowedUsers = scope === 'TEAM' ? [userId, ...teamUserIds] : [userId];
  if (!isCustomerUserAllowed(customer, allowedUsers)) {
    throw new ForbiddenException({
      code: ERROR_CODES.FORBIDDEN,
      message: 'Access denied: you do not have permission to access this customer',
    });
  }
}

export function buildCustomerScopeWhere(
  context: CustomerScopeContext,
): Prisma.CustomerWhereInput | null {
  const { userId, scope, teamUserIds = [], branchIds = [] } = context;

  if (scope === 'ALL') {
    return null;
  }

  if (scope === 'BRANCH') {
    return {
      branchId: { in: branchIds },
    };
  }

  const allowed = scope === 'TEAM' ? [userId, ...teamUserIds] : [userId];
  return {
    OR: [{ assignedToId: { in: allowed } }, { createdById: { in: allowed } }],
  };
}
