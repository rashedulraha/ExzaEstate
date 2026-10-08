import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@exzaestate/shared';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { BookingTransferService } from './booking-transfer.service.js';
import { RequestTransferDto } from './dto/index.js';

@ApiTags('Sales: Booking Transfers')
@ApiBearerAuth()
@Controller('sales/transfers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BookingTransferController {
  constructor(private readonly transferService: BookingTransferService) {}

  @Post()
  @RequirePermission(PERMISSIONS.BOOKING_TRANSFER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Execute booking transfer (name transfer) to new customer' })
  async executeTransfer(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: RequestTransferDto,
  ) {
    return this.transferService.executeTransfer(companyId, userId, dto);
  }
}
