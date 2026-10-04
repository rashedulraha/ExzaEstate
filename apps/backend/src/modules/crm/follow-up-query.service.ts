import { Injectable } from '@nestjs/common';
import { getTodayBusinessDate } from '@exzaestate/shared';
import { TenantDb } from '../../database/tenant-db.service.js';
import { formatFollowUpResponse } from './follow-up.mapper.js';
import { buildFollowUpWhereClause, type FollowUpScopeContext } from './follow-up-scope.helper.js';
import { findAndScopeFollowUp, FOLLOW_UP_INCLUDE } from './follow-up-service.helper.js';
import type { FollowUpResponseDto, QueryFollowUpsDto } from './dto/index.js';

export interface PaginatedFollowUpsResponse {
  data: FollowUpResponseDto[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
}

@Injectable()
export class FollowUpQueryService {
  constructor(private readonly tenantDb: TenantDb) {}

  async listFollowUps(
    companyId: string,
    query: QueryFollowUpsDto,
    context: FollowUpScopeContext,
    companyTimezone: string = 'Asia/Dhaka',
  ): Promise<PaginatedFollowUpsResponse> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const todayStr = getTodayBusinessDate(companyTimezone);
    const where = buildFollowUpWhereClause(companyId, query, context, todayStr);

    return this.tenantDb.withCompany(companyId, async (tx) => {
      const [total, items] = await Promise.all([
        tx.followUp.count({ where }),
        tx.followUp.findMany({
          where,
          include: FOLLOW_UP_INCLUDE,
          orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
          skip,
          take: limit,
        }),
      ]);

      return {
        data: items.map((item) => formatFollowUpResponse(item, companyTimezone)),
        meta: {
          page,
          pageSize: limit,
          total,
        },
      };
    });
  }

  async getFollowUpById(
    companyId: string,
    id: string,
    context: FollowUpScopeContext,
    companyTimezone: string = 'Asia/Dhaka',
  ): Promise<FollowUpResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const followUp = await findAndScopeFollowUp(tx, companyId, id, context);
      return formatFollowUpResponse(followUp, companyTimezone);
    });
  }

  async listLeadFollowUps(
    companyId: string,
    leadId: string,
    context: FollowUpScopeContext,
    companyTimezone: string = 'Asia/Dhaka',
  ): Promise<FollowUpResponseDto[]> {
    const todayStr = getTodayBusinessDate(companyTimezone);
    const query: QueryFollowUpsDto = { leadId };
    const where = buildFollowUpWhereClause(companyId, query, context, todayStr);

    return this.tenantDb.withCompany(companyId, async (tx) => {
      const items = await tx.followUp.findMany({
        where,
        include: FOLLOW_UP_INCLUDE,
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      });

      return items.map((item) => formatFollowUpResponse(item, companyTimezone));
    });
  }
}
