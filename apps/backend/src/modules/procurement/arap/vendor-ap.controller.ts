import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@exzaestate/shared';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { VendorApService } from './vendor-ap.service.js';

@ApiTags('Accounts Payable')
@ApiBearerAuth()
@Controller('arap/vendors')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class VendorApController {
  constructor(private readonly apService: VendorApService) {}

  @Get(':id/balance')
  @RequirePermission(PERMISSIONS.ARAP_VIEW)
  @ApiOperation({ summary: 'Get vendor AP balance reconciled with Account 2100' })
  async getBalance(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.apService.getVendorApBalance(companyId, id);
  }

  @Get('aging')
  @RequirePermission(PERMISSIONS.ARAP_VIEW)
  @ApiOperation({ summary: 'Get Accounts Payable aging report' })
  async getAging(
    @CurrentUser('companyId') companyId: string,
    @Query('asOfDate') asOfDate?: string,
  ) {
    const parsedDate = asOfDate ? new Date(asOfDate) : new Date();
    return this.apService.getVendorApAging(companyId, parsedDate);
  }

  @Get(':id/ledger')
  @RequirePermission(PERMISSIONS.ARAP_VIEW)
  @ApiOperation({ summary: 'Get vendor AP journal ledger' })
  async getLedger(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.apService.getVendorLedger(companyId, id);
  }
}
