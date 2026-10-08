import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@exzaestate/shared';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { VendorPaymentService } from './vendor-payment.service.js';
import { CreateVendorPaymentDto } from '../dto/index.js';

@ApiTags('Vendor Payments')
@ApiBearerAuth()
@Controller('vendor-payments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class VendorPaymentController {
  constructor(private readonly paymentService: VendorPaymentService) {}

  @Post()
  @RequirePermission(PERMISSIONS.PROCUREMENT_APPROVE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Disburse payment to vendor and post AP settlement journal' })
  async createPayment(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateVendorPaymentDto,
  ) {
    return this.paymentService.createPayment(companyId, userId, dto);
  }
}
