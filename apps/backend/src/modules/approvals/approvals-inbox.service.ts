import { Injectable, NotFoundException } from '@nestjs/common';
import { ERROR_CODES, PERMISSIONS } from '@exzaestate/shared';
import { TenantDb } from '../../database/tenant-db.service.js';
import { mapApprovalToDto } from './approvals.mapper.js';
import type {
  ApprovalListResponseDto,
  ApprovalResponseDto,
  QueryApprovalsDto,
} from './dto/index.js';

function expandAuthorizedPermissions(userPermissions: readonly string[]): string[] {
  const perms = new Set<string>(userPermissions);

  if (perms.has(PERMISSIONS.DISCOUNT_APPROVE_TIER3)) {
    perms.add(PERMISSIONS.DISCOUNT_APPROVE_TIER2);
    perms.add(PERMISSIONS.DISCOUNT_APPROVE_TIER1);
  } else if (perms.has(PERMISSIONS.DISCOUNT_APPROVE_TIER2)) {
    perms.add(PERMISSIONS.DISCOUNT_APPROVE_TIER1);
  }

  return Array.from(perms);
}

@Injectable()
export class ApprovalsInboxService {
  constructor(private readonly tenantDb: TenantDb) {}

  async getInbox(
    companyId: string,
    userId: string,
    userPermissions: readonly string[],
    query: QueryApprovalsDto,
  ): Promise<ApprovalListResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const page = query.page && query.page > 0 ? query.page : 1;
      const limit = query.limit && query.limit > 0 ? query.limit : 20;
      const skip = (page - 1) * limit;

      const expandedPerms = expandAuthorizedPermissions(userPermissions);

      const where: Record<string, unknown> = {
        companyId,
        status: query.status || 'PENDING',
        deletedAt: null,
        requesterId: { not: userId }, // Maker-checker: requester does not see own items in inbox
        steps: {
          some: {
            status: 'PENDING',
            requiredPermission: { in: expandedPerms },
          },
        },
      };

      if (query.type) where.type = query.type;
      if (query.entityType) where.entityType = query.entityType;
      if (query.search?.trim()) {
        const s = query.search.trim();
        where.OR = [
          { title: { contains: s, mode: 'insensitive' } },
          { approvalNumber: { contains: s, mode: 'insensitive' } },
        ];
      }

      const [items, total] = await Promise.all([
        tx.approval.findMany({
          where,
          include: { steps: { orderBy: { stepOrder: 'asc' } } },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        tx.approval.count({ where }),
      ]);

      return {
        items: items.map(mapApprovalToDto),
        total,
        page,
        limit,
      };
    });
  }

  async getSent(
    companyId: string,
    userId: string,
    query: QueryApprovalsDto,
  ): Promise<ApprovalListResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const page = query.page && query.page > 0 ? query.page : 1;
      const limit = query.limit && query.limit > 0 ? query.limit : 20;
      const skip = (page - 1) * limit;

      const where: Record<string, unknown> = {
        companyId,
        requesterId: userId,
        deletedAt: null,
      };

      if (query.status) where.status = query.status;
      if (query.type) where.type = query.type;
      if (query.entityType) where.entityType = query.entityType;
      if (query.search?.trim()) {
        const s = query.search.trim();
        where.OR = [
          { title: { contains: s, mode: 'insensitive' } },
          { approvalNumber: { contains: s, mode: 'insensitive' } },
        ];
      }

      const [items, total] = await Promise.all([
        tx.approval.findMany({
          where,
          include: { steps: { orderBy: { stepOrder: 'asc' } } },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        tx.approval.count({ where }),
      ]);

      return {
        items: items.map(mapApprovalToDto),
        total,
        page,
        limit,
      };
    });
  }

  async getApprovalById(companyId: string, id: string): Promise<ApprovalResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const approval = await tx.approval.findFirst({
        where: { id, companyId, deletedAt: null },
        include: { steps: { orderBy: { stepOrder: 'asc' } } },
      });
      if (!approval) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: `Approval request "${id}" not found`,
        });
      }

      return mapApprovalToDto(approval);
    });
  }

  async expireOverdueApprovals(companyId: string): Promise<{ expiredCount: number }> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const now = new Date();
      const overdueApprovals = await tx.approval.findMany({
        where: {
          companyId,
          status: 'PENDING',
          expiresAt: { lt: now },
          deletedAt: null,
        },
        select: { id: true },
      });

      if (overdueApprovals.length === 0) {
        return { expiredCount: 0 };
      }

      const ids = overdueApprovals.map((a) => a.id);

      await tx.approvalStep.updateMany({
        where: { approvalId: { in: ids }, status: 'PENDING' },
        data: { status: 'EXPIRED' },
      });

      const result = await tx.approval.updateMany({
        where: { id: { in: ids } },
        data: {
          status: 'EXPIRED',
          finalDecision: 'EXPIRED',
          completedAt: now,
        },
      });

      return { expiredCount: result.count };
    });
  }
}
