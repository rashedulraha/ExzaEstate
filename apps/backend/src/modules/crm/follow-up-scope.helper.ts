import { ForbiddenException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { type DataScope, ERROR_CODES } from '@exzaestate/shared';
import type { QueryFollowUpsDto } from './dto/query-follow-ups.dto.js';

export interface FollowUpScopeContext {
  userId: string;
  scope: DataScope;
  teamUserIds?: string[];
  branchIds?: string[];
}

function isBranchAllowed(leadBranchId: string | null | undefined, branchIds: string[]): boolean {
  return Boolean(leadBranchId && branchIds.includes(leadBranchId));
}

function isUserAllowed(
  followUp: { assignedToId: string; createdById: string | null },
  allowedUsers: string[],
): boolean {
  if (allowedUsers.includes(followUp.assignedToId)) {
    return true;
  }
  return Boolean(followUp.createdById && allowedUsers.includes(followUp.createdById));
}

export function enforceFollowUpScope(
  followUp: {
    assignedToId: string;
    createdById: string | null;
    lead?: { branchId: string | null } | null;
  },
  context: FollowUpScopeContext,
): void {
  const { userId, scope, teamUserIds = [], branchIds = [] } = context;

  if (scope === 'ALL') {
    return;
  }

  if (scope === 'BRANCH') {
    if (!isBranchAllowed(followUp.lead?.branchId, branchIds)) {
      throw new ForbiddenException({
        code: ERROR_CODES.FORBIDDEN,
        message: 'Access denied: follow-up does not belong to your assigned branch',
      });
    }
    return;
  }

  const allowedUsers = scope === 'TEAM' ? [userId, ...teamUserIds] : [userId];
  if (!isUserAllowed(followUp, allowedUsers)) {
    throw new ForbiddenException({
      code: ERROR_CODES.FORBIDDEN,
      message: 'Access denied: you do not have permission to access this follow-up',
    });
  }
}

export function buildFollowUpScopeWhere(
  context: FollowUpScopeContext,
): Prisma.FollowUpWhereInput | null {
  const { userId, scope, teamUserIds = [], branchIds = [] } = context;

  if (scope === 'ALL') {
    return null;
  }

  if (scope === 'BRANCH') {
    return {
      lead: {
        branchId: { in: branchIds },
      },
    };
  }

  const allowed = scope === 'TEAM' ? [userId, ...teamUserIds] : [userId];
  return {
    OR: [{ assignedToId: { in: allowed } }, { createdById: { in: allowed } }],
  };
}

export function buildFollowUpFilterConditions(
  query: QueryFollowUpsDto,
  todayStr: string,
): Prisma.FollowUpWhereInput[] {
  const conditions: Prisma.FollowUpWhereInput[] = [];

  if (query.leadId) conditions.push({ leadId: query.leadId });
  if (query.customerId) conditions.push({ customerId: query.customerId });
  if (query.assignedToId) conditions.push({ assignedToId: query.assignedToId });
  if (query.status) conditions.push({ status: query.status });
  if (query.type) conditions.push({ type: query.type });
  if (query.priority) conditions.push({ priority: query.priority });

  if (query.overdueOnly) {
    conditions.push({
      status: 'PENDING',
      dueDate: { lt: new Date(`${todayStr}T00:00:00.000Z`) },
    });
  }

  if (query.dateFrom) {
    conditions.push({
      dueDate: { gte: new Date(`${query.dateFrom}T00:00:00.000Z`) },
    });
  }

  if (query.dateTo) {
    conditions.push({
      dueDate: { lte: new Date(`${query.dateTo}T00:00:00.000Z`) },
    });
  }

  return conditions;
}

export function buildFollowUpWhereClause(
  companyId: string,
  query: QueryFollowUpsDto,
  context: FollowUpScopeContext,
  todayStr: string,
): Prisma.FollowUpWhereInput {
  const andConditions: Prisma.FollowUpWhereInput[] = [{ companyId }, { deletedAt: null }];

  const scopeCondition = buildFollowUpScopeWhere(context);
  if (scopeCondition) {
    andConditions.push(scopeCondition);
  }

  const filterConditions = buildFollowUpFilterConditions(query, todayStr);
  if (filterConditions.length > 0) {
    andConditions.push(...filterConditions);
  }

  return { AND: andConditions };
}
