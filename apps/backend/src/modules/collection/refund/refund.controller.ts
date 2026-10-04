import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@exzaestate/shared';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { PayRefundDto, QueryRefundDto, RefundResponseDto } from './dto/refund.dto.js';
import { RefundService } from './refund.service.js';

@ApiTags('Collection - Refunds')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('collection/refunds')
export class RefundController {
  constructor(private readonly refundService: RefundService) {}

  @Get()
  @RequirePermission(PERMISSIONS.REFUND_VIEW)
  @ApiOperation({ summary: 'List and query refunds' })
  async listRefunds(
    @CurrentUser('companyId') companyId: string,
    @Query() query: QueryRefundDto,
  ): Promise<{ items: RefundResponseDto[]; total: number; page: number; limit: number }> {
    return this.refundService.listRefunds(companyId, query);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.REFUND_VIEW)
  @ApiOperation({ summary: 'Get refund by ID' })
  async getRefundById(
    @CurrentUser('companyId') companyId: string,
    @Param('id') refundId: string,
  ): Promise<RefundResponseDto> {
    return this.refundService.getRefundById(companyId, refundId);
  }

  @Post(':id/pay')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.PAYMENT_REFUND)
  @ApiOperation({ summary: 'Disburse refund payment (posts REFUND_PAID journal)' })
  async payRefund(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') refundId: string,
    @Body() dto: PayRefundDto,
  ): Promise<RefundResponseDto> {
    return this.refundService.payRefund(companyId, userId, refundId, dto);
  }
}
