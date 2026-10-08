import { Inject, Injectable, Optional } from '@nestjs/common';
import { QUEUE_NAMES } from '../../jobs/queues.js';
import { QUEUE_DRIVER, type QueueDriver } from '../../ports/index.js';
import { BalanceSheetReportDto } from './dto/balance-sheet-response.dto.js';
import { ExportReportDto, ReportExportJobResponseDto } from './dto/export-report.dto.js';
import { IncomeStatementReportDto } from './dto/income-statement-response.dto.js';
import { QueryBalanceSheetDto } from './dto/query-balance-sheet.dto.js';
import { QueryIncomeStatementDto } from './dto/query-income-statement.dto.js';
import { QueryTrialBalanceDto } from './dto/query-trial-balance.dto.js';
import { TrialBalanceReportDto } from './dto/trial-balance-response.dto.js';
import { BalanceSheetQuery } from './queries/balance-sheet.query.js';
import { IncomeStatementQuery } from './queries/income-statement.query.js';
import { TrialBalanceQuery } from './queries/trial-balance.query.js';

import { ProjectProfitabilityQuery } from './queries/profitability/project-profitability.query.js';
import type { QueryProfitabilityDto } from './dto/query-profitability.dto.js';
import type { ProjectProfitabilityReportDto } from './dto/profitability-response.dto.js';

import { ManagementKpiQuery } from './queries/kpi/management-kpi.query.js';
import { SalesReportQuery, type SalesReportResult } from './queries/kpi/sales-report.query.js';
import {
  CollectionReportQuery,
  type CollectionReportResult,
} from './queries/kpi/collection-report.query.js';
import {
  InventoryReportQuery,
  type InventoryReportResult,
} from './queries/kpi/inventory-report.query.js';
import type {
  ManagementKpis,
  QueryKpiFilterDto,
  SalespersonPerformanceDto,
  ScopeFilterContext,
} from './queries/kpi/kpi.types.js';

@Injectable()
export class ReportsService {
  constructor(
    private readonly trialBalanceQuery: TrialBalanceQuery,
    private readonly balanceSheetQuery: BalanceSheetQuery,
    private readonly incomeStatementQuery: IncomeStatementQuery,
    private readonly profitabilityQuery: ProjectProfitabilityQuery,
    private readonly managementKpiQuery: ManagementKpiQuery,
    private readonly salesReportQuery: SalesReportQuery,
    private readonly collectionReportQuery: CollectionReportQuery,
    private readonly inventoryReportQuery: InventoryReportQuery,
    @Optional()
    @Inject(QUEUE_DRIVER)
    private readonly queueDriver?: QueueDriver,
  ) {}

  async getManagementKpis(
    companyId: string,
    filter: QueryKpiFilterDto = {},
    scopeCtx?: ScopeFilterContext,
  ): Promise<ManagementKpis> {
    return this.managementKpiQuery.execute(companyId, filter, scopeCtx);
  }

  async getSalespersonPerformance(
    companyId: string,
    filter: QueryKpiFilterDto = {},
    scopeCtx?: ScopeFilterContext,
  ): Promise<SalespersonPerformanceDto[]> {
    return this.managementKpiQuery.getSalespersonPerformance(companyId, filter, scopeCtx);
  }

  async getSalesReport(
    companyId: string,
    filter: QueryKpiFilterDto = {},
    scopeCtx?: ScopeFilterContext,
  ): Promise<SalesReportResult> {
    return this.salesReportQuery.execute(companyId, filter, scopeCtx);
  }

  async getCollectionReport(
    companyId: string,
    filter: QueryKpiFilterDto = {},
  ): Promise<CollectionReportResult> {
    return this.collectionReportQuery.execute(companyId, filter);
  }

  async getInventoryReport(
    companyId: string,
    filter: QueryKpiFilterDto = {},
  ): Promise<InventoryReportResult> {
    return this.inventoryReportQuery.execute(companyId, filter);
  }

  async getProjectProfitability(
    companyId: string,
    dto: QueryProfitabilityDto,
  ): Promise<ProjectProfitabilityReportDto> {
    return this.profitabilityQuery.execute(companyId, dto);
  }

  async getTrialBalance(
    companyId: string,
    dto: QueryTrialBalanceDto,
  ): Promise<TrialBalanceReportDto> {
    return this.trialBalanceQuery.execute(companyId, dto);
  }

  async getBalanceSheet(
    companyId: string,
    dto: QueryBalanceSheetDto,
  ): Promise<BalanceSheetReportDto> {
    return this.balanceSheetQuery.execute(companyId, dto);
  }

  async getIncomeStatement(
    companyId: string,
    dto: QueryIncomeStatementDto,
  ): Promise<IncomeStatementReportDto> {
    return this.incomeStatementQuery.execute(companyId, dto);
  }

  async exportReport(
    companyId: string,
    userId: string,
    reportType:
      | 'TRIAL_BALANCE'
      | 'BALANCE_SHEET'
      | 'INCOME_STATEMENT'
      | 'PROJECT_PROFITABILITY'
      | 'SALES'
      | 'COLLECTION'
      | 'INVENTORY',
    dto: ExportReportDto,
  ): Promise<ReportExportJobResponseDto> {
    const format = dto.format ?? 'PDF';
    const payload = {
      companyId,
      userId,
      reportType,
      format,
      filters: dto,
      requestedAt: new Date().toISOString(),
    };

    let jobId: string = crypto.randomUUID();
    if (this.queueDriver) {
      jobId = await this.queueDriver.enqueue(QUEUE_NAMES.REPORT_EXPORT, payload);
    }

    return {
      jobId,
      status: 'QUEUED',
      message: `${reportType} export job queued successfully`,
    };
  }
}
