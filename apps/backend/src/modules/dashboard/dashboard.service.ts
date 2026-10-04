import { Injectable } from '@nestjs/common';
import { ManagementKpiQuery } from '../reports/queries/kpi/management-kpi.query.js';
import type {
  ManagementKpis,
  QueryKpiFilterDto,
  SalespersonPerformanceDto,
  ScopeFilterContext,
} from '../reports/queries/kpi/kpi.types.js';

@Injectable()
export class DashboardService {
  constructor(private readonly kpiQuery: ManagementKpiQuery) {}

  async getSummary(
    companyId: string,
    filter: QueryKpiFilterDto = {},
    scopeCtx?: ScopeFilterContext,
  ): Promise<ManagementKpis> {
    return this.kpiQuery.execute(companyId, filter, scopeCtx);
  }

  async getSalesPerformance(
    companyId: string,
    filter: QueryKpiFilterDto = {},
    scopeCtx?: ScopeFilterContext,
  ): Promise<SalespersonPerformanceDto[]> {
    return this.kpiQuery.getSalespersonPerformance(companyId, filter, scopeCtx);
  }
}
