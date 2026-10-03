import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@exzaestate/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { CostCenterService } from './cost-center.service.js';
import { UpdateCostCenterDto } from './dto/cost-center.dto.js';

@ApiTags('Cost Centers')
@ApiBearerAuth()
@Controller('cost-centers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CostCenterController {
  constructor(private readonly costCenterService: CostCenterService) {}

  @Get()
  @RequirePermission(PERMISSIONS.PROJECT_VIEW)
  @ApiOperation({ summary: 'List all cost centers for the company' })
  async listCostCenters(@CurrentUser('companyId') companyId: string) {
    return this.costCenterService.listCostCenters(companyId);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.PROJECT_VIEW)
  @ApiOperation({ summary: 'Get cost center details by ID' })
  async getCostCenterById(@CurrentUser('companyId') companyId: string, @Param('id') id: string) {
    return this.costCenterService.getCostCenterById(companyId, id);
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.PROJECT_EDIT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update cost center details' })
  async updateCostCenter(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCostCenterDto,
  ) {
    return this.costCenterService.updateCostCenter(companyId, id, dto);
  }
}
