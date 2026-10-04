import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@exzaestate/shared';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { AgingService } from './aging.service.js';
import { AgingReportResponseDto, QueryAgingDto } from './dto/aging.dto.js';

@ApiTags('Collection - AR Aging')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('collection/aging')
export class AgingController {
  constructor(private readonly agingService: AgingService) {}

  @Get()
  @RequirePermission(PERMISSIONS.STATEMENT_VIEW)
  @ApiOperation({ summary: 'Get AR aging report with 1–7, 8–30, 31–60, 61–90, 90+ buckets' })
  async getAgingReport(
    @CurrentUser('companyId') companyId: string,
    @Query() query: QueryAgingDto,
  ): Promise<AgingReportResponseDto> {
    return this.agingService.getAgingReport(companyId, query);
  }
}
