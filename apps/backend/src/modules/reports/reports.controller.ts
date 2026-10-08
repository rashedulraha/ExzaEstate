import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@exzaestate/shared';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { BalanceSheetReportDto } from './dto/balance-sheet-response.dto.js';
import { ExportReportDto, ReportExportJobResponseDto } from './dto/export-report.dto.js';
import { IncomeStatementReportDto } from './dto/income-statement-response.dto.js';
import { ProjectProfitabilityReportDto } from './dto/profitability-response.dto.js';
import { QueryBalanceSheetDto } from './dto/query-balance-sheet.dto.js';
import { QueryIncomeStatementDto } from './dto/query-income-statement.dto.js';
import { QueryKpiFilterDto } from './dto/query-kpi-filter.dto.js';
import { QueryProfitabilityDto } from './dto/query-profitability.dto.js';
import { QueryTrialBalanceDto } from './dto/query-trial-balance.dto.js';
import { TrialBalanceReportDto } from './dto/trial-balance-response.dto.js';
import { ReportsService } from './reports.service.js';

@ApiTags('Reports - Financial')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('trial-balance')
  @RequirePermission(PERMISSIONS.REPORT_VIEW)
  @ApiOperation({ summary: 'Generate Trial Balance report (total debits equal credits)' })
  @ApiResponse({ status: 200, type: TrialBalanceReportDto })
  async getTrialBalance(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryTrialBalanceDto,
  ): Promise<TrialBalanceReportDto> {
    return this.reportsService.getTrialBalance(user.companyId, query);
  }

  @Post('trial-balance/export')
  @HttpCode(HttpStatus.ACCEPTED)
  @RequirePermission(PERMISSIONS.REPORT_EXPORT)
  @ApiOperation({ summary: 'Queue asynchronous export of Trial Balance report' })
  @ApiResponse({ status: 202, type: ReportExportJobResponseDto })
  async exportTrialBalance(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ExportReportDto,
  ): Promise<ReportExportJobResponseDto> {
    return this.reportsService.exportReport(user.companyId, user.userId, 'TRIAL_BALANCE', dto);
  }

  @Get('balance-sheet')
  @RequirePermission(PERMISSIONS.REPORT_VIEW)
  @ApiOperation({ summary: 'Generate Balance Sheet report (Assets = Liabilities + Equity)' })
  @ApiResponse({ status: 200, type: BalanceSheetReportDto })
  async getBalanceSheet(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryBalanceSheetDto,
  ): Promise<BalanceSheetReportDto> {
    return this.reportsService.getBalanceSheet(user.companyId, query);
  }

  @Post('balance-sheet/export')
  @HttpCode(HttpStatus.ACCEPTED)
  @RequirePermission(PERMISSIONS.REPORT_EXPORT)
  @ApiOperation({ summary: 'Queue asynchronous export of Balance Sheet report' })
  @ApiResponse({ status: 202, type: ReportExportJobResponseDto })
  async exportBalanceSheet(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ExportReportDto,
  ): Promise<ReportExportJobResponseDto> {
    return this.reportsService.exportReport(user.companyId, user.userId, 'BALANCE_SHEET', dto);
  }

  @Get('income-statement')
  @RequirePermission(PERMISSIONS.REPORT_VIEW)
  @ApiOperation({ summary: 'Generate Income Statement / Profit & Loss report' })
  @ApiResponse({ status: 200, type: IncomeStatementReportDto })
  async getIncomeStatement(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryIncomeStatementDto,
  ): Promise<IncomeStatementReportDto> {
    return this.reportsService.getIncomeStatement(user.companyId, query);
  }

  @Post('income-statement/export')
  @HttpCode(HttpStatus.ACCEPTED)
  @RequirePermission(PERMISSIONS.REPORT_EXPORT)
  @ApiOperation({ summary: 'Queue asynchronous export of Income Statement report' })
  @ApiResponse({ status: 202, type: ReportExportJobResponseDto })
  async exportIncomeStatement(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ExportReportDto,
  ): Promise<ReportExportJobResponseDto> {
    return this.reportsService.exportReport(user.companyId, user.userId, 'INCOME_STATEMENT', dto);
  }

  @Get('profitability')
  @RequirePermission(PERMISSIONS.REPORT_VIEW)
  @ApiOperation({ summary: 'Generate Project Profitability report' })
  @ApiResponse({ status: 200, type: ProjectProfitabilityReportDto })
  async getProjectProfitability(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryProfitabilityDto,
  ): Promise<ProjectProfitabilityReportDto> {
    return this.reportsService.getProjectProfitability(user.companyId, query);
  }

  @Post('profitability/export')
  @HttpCode(HttpStatus.ACCEPTED)
  @RequirePermission(PERMISSIONS.REPORT_EXPORT)
  @ApiOperation({ summary: 'Queue asynchronous export of Project Profitability report' })
  @ApiResponse({ status: 202, type: ReportExportJobResponseDto })
  async exportProfitability(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ExportReportDto,
  ): Promise<ReportExportJobResponseDto> {
    return this.reportsService.exportReport(
      user.companyId,
      user.userId,
      'PROJECT_PROFITABILITY',
      dto,
    );
  }

  @Get('sales')
  @RequirePermission(PERMISSIONS.REPORT_VIEW)
  @ApiOperation({ summary: 'Generate Sales Report' })
  async getSalesReport(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryKpiFilterDto) {
    return this.reportsService.getSalesReport(user.companyId, query);
  }

  @Get('collection')
  @RequirePermission(PERMISSIONS.REPORT_VIEW)
  @ApiOperation({ summary: 'Generate Collection Report' })
  async getCollectionReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryKpiFilterDto,
  ) {
    return this.reportsService.getCollectionReport(user.companyId, query);
  }

  @Get('inventory')
  @RequirePermission(PERMISSIONS.REPORT_VIEW)
  @ApiOperation({ summary: 'Generate Property Inventory Status Report' })
  async getInventoryReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryKpiFilterDto,
  ) {
    return this.reportsService.getInventoryReport(user.companyId, query);
  }
}
