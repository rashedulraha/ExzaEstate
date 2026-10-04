import { ForbiddenException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { type DataScope, ERROR_CODES } from '@exzaestate/shared';
import type { QueryLeadsDto } from './dto/query-leads.dto.js';

export interface ScopeContext {
  userId: string;
  scope: DataScope;
  teamUserIds?: string[];
  branchIds?: string[];
}

function isOwnedByAny(
  lead: { assignedToId: string | null; createdById: string | null },
  userIds: string[],
): boolean {
  if (lead.assignedToId) {
    return userIds.includes(lead.assignedToId);
  }
  return lead.createdById ? userIds.includes(lead.createdById) : false;
}

export function enforceLeadScope(
  lead: { assignedToId: string | null; createdById: string | null; branchId: string | null },
  context: ScopeContext,
): void {
  const { userId, scope, teamUserIds = [], branchIds = [] } = context;

  if (scope === 'ALL') {
    return;
  }

  if (scope === 'BRANCH') {
    if (!lead.branchId || !branchIds.includes(lead.branchId)) {
      throw new ForbiddenException({
        code: ERROR_CODES.FORBIDDEN,
        message: 'Access denied: lead does not belong to your assigned branch',
      });
    }
    return;
  }

  const allowedUsers = scope === 'TEAM' ? [userId, ...teamUserIds] : [userId];
  if (!isOwnedByAny(lead, allowedUsers)) {
    throw new ForbiddenException({
      code: ERROR_CODES.FORBIDDEN,
      message: 'Access denied: you do not have permission to access this lead',
    });
  }
}

export function buildScopeWhereCondition(context: ScopeContext): Prisma.LeadWhereInput | null {
  const { userId, scope, teamUserIds = [], branchIds = [] } = context;

  if (scope === 'ALL') {
    return null;
  }

  if (scope === 'BRANCH') {
    return { branchId: { in: branchIds } };
  }

  const allowed = scope === 'TEAM' ? [userId, ...teamUserIds] : [userId];
  return {
    OR: [{ assignedToId: { in: allowed } }, { assignedToId: null, createdById: { in: allowed } }],
  };
}

export function buildFilterConditions(query: QueryLeadsDto): Prisma.LeadWhereInput[] {
  const conditions: Prisma.LeadWhereInput[] = [];

  if (query.status) conditions.push({ status: query.status });
  if (query.source) conditions.push({ source: query.source });
  if (query.assignedToId) conditions.push({ assignedToId: query.assignedToId });
  if (query.branchId) conditions.push({ branchId: query.branchId });
  if (query.preferredProjectId) conditions.push({ preferredProjectId: query.preferredProjectId });

  if (query.search?.trim()) {
    const term = query.search.trim();
    conditions.push({
      OR: [
        { name: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { leadNumber: { contains: term, mode: 'insensitive' } },
      ],
    });
  }

  return conditions;
}

export function buildLeadWhereClause(
  companyId: string,
  query: QueryLeadsDto,
  context: ScopeContext,
): Prisma.LeadWhereInput {
  const andConditions: Prisma.LeadWhereInput[] = [{ companyId }, { deletedAt: null }];

  const scopeCondition = buildScopeWhereCondition(context);
  if (scopeCondition) {
    andConditions.push(scopeCondition);
  }

  const filterConditions = buildFilterConditions(query);
  if (filterConditions.length > 0) {
    andConditions.push(...filterConditions);
  }

  return { AND: andConditions };
}
