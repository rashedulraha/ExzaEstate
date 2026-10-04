import { Injectable, NotFoundException } from '@nestjs/common';
import { ERROR_CODES } from '@exzaestate/shared';
import { TenantDb } from '../../database/tenant-db.service.js';
import { formatLeadResponse } from './crm.mapper.js';
import { buildLeadWhereClause, enforceLeadScope, type ScopeContext } from './crm-scope.helper.js';
import type { LeadResponseDto, PaginatedLeadResponseDto } from './dto/lead-response.dto.js';
import type { QueryLeadsDto } from './dto/query-leads.dto.js';

export const LEAD_QUERY_INCLUDE = {
  statusHistory: {
    orderBy: { createdAt: 'desc' as const },
    take: 50,
  },
} as const;

@Injectable()
export class CrmQueryService {
  constructor(private readonly tenantDb: TenantDb) {}

  async listLeads(
    companyId: string,
    query: QueryLeadsDto,
    context: ScopeContext,
  ): Promise<PaginatedLeadResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const where = buildLeadWhereClause(companyId, query, context);
      const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
      const page = Math.max(query.page ?? 1, 1);
      const skip = query.offset !== undefined ? Math.max(query.offset, 0) : (page - 1) * limit;

      const [items, total] = await Promise.all([
        tx.lead.findMany({
          where,
          include: LEAD_QUERY_INCLUDE,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        tx.lead.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        items: items.map(formatLeadResponse),
        total,
        page,
        limit,
        totalPages,
      };
    });
  }

  async getLeadById(
    companyId: string,
    id: string,
    context: ScopeContext,
  ): Promise<LeadResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const lead = await tx.lead.findFirst({
        where: { id, companyId, deletedAt: null },
        include: LEAD_QUERY_INCLUDE,
      });

      if (!lead) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: `Lead with ID "${id}" was not found`,
        });
      }

      enforceLeadScope(lead, context);
      return formatLeadResponse(lead);
    });
  }
}
