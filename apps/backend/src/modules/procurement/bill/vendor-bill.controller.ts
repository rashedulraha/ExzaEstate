import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@exzaestate/shared';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { VendorBillService } from './vendor-bill.service.js';
import { CreateVendorBillDto } from '../dto/index.js';

@ApiTags('Vendor Bills')
@ApiBearerAuth()
@Controller('vendor-bills')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class VendorBillController {
  constructor(private readonly billService: VendorBillService) {}

  @Post()
  @RequirePermission(PERMISSIONS.VENDOR_BILL_CREATE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create and optionally post a vendor bill' })
  async createBill(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateVendorBillDto,
  ) {
    return this.billService.createBill(companyId, userId, dto);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.VENDOR_BILL_VIEW)
  @ApiOperation({ summary: 'Get vendor bill details by ID' })
  async getBill(@CurrentUser('companyId') companyId: string, @Param('id') id: string) {
    return this.billService.getBillById(companyId, id);
  }

  @Post(':id/post')
  @RequirePermission(PERMISSIONS.VENDOR_BILL_CREATE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Post a draft vendor bill to accounts payable' })
  async postBill(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.billService.postBill(companyId, userId, id);
  }
}
