import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { BalanceSheetQuery } from './queries/balance-sheet.query.js';
import { IncomeStatementQuery } from './queries/income-statement.query.js';
import { ProjectProfitabilityQuery } from './queries/profitability/project-profitability.query.js';
import { TrialBalanceQuery } from './queries/trial-balance.query.js';
import { ManagementKpiQuery } from './queries/kpi/management-kpi.query.js';
import { SalesReportQuery } from './queries/kpi/sales-report.query.js';
import { CollectionReportQuery } from './queries/kpi/collection-report.query.js';
import { InventoryReportQuery } from './queries/kpi/inventory-report.query.js';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';

@Module({
  imports: [AuthModule],
  controllers: [ReportsController],
  providers: [
    TrialBalanceQuery,
    BalanceSheetQuery,
    IncomeStatementQuery,
    ProjectProfitabilityQuery,
    ManagementKpiQuery,
    SalesReportQuery,
    CollectionReportQuery,
    InventoryReportQuery,
    ReportsService,
  ],
  exports: [
    ReportsService,
    TrialBalanceQuery,
    BalanceSheetQuery,
    IncomeStatementQuery,
    ProjectProfitabilityQuery,
    ManagementKpiQuery,
    SalesReportQuery,
    CollectionReportQuery,
    InventoryReportQuery,
  ],
})
export class ReportsModule {}
