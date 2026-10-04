import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@exzaestate/shared';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { QueryKpiFilterDto } from '../reports/dto/query-kpi-filter.dto.js';
import { DashboardService } from './dashboard.service.js';

@ApiTags('Management Dashboard & KPIs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @RequirePermission(PERMISSIONS.DASHBOARD_VIEW)
  @ApiOperation({
    summary: 'Get executive management dashboard KPIs (AT-15: identical to reports)',
  })
  @ApiResponse({ status: 200, description: 'Aggregated management KPIs' })
  async getSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filter: QueryKpiFilterDto,
  ) {
    return this.dashboardService.getSummary(user.companyId, filter);
  }

  @Get('sales-performance')
  @RequirePermission(PERMISSIONS.DASHBOARD_VIEW)
  @ApiOperation({ summary: 'Get salesperson performance breakdown' })
  @ApiResponse({ status: 200, description: 'Salesperson performance items' })
  async getSalesPerformance(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filter: QueryKpiFilterDto,
  ) {
    return this.dashboardService.getSalesPerformance(user.companyId, filter);
  }
}
