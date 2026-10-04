import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@exzaestate/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { CommissionService } from './commission.service.js';
import {
  CreateBrokerDto,
  CreateCommissionRuleDto,
  PayCommissionDto,
} from './dto/index.js';

@ApiTags('Commissions & Brokers')
@ApiBearerAuth()
@Controller('commissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CommissionController {
  constructor(private readonly commissionService: CommissionService) {}

  @Post('brokers')
  @RequirePermission(PERMISSIONS.COMMISSION_CREATE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new broker' })
  async createBroker(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateBrokerDto,
  ) {
    return this.commissionService.createBroker(companyId, userId, dto);
  }

  @Post('rules')
  @RequirePermission(PERMISSIONS.COMMISSION_CREATE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a commission rule' })
  async createRule(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateCommissionRuleDto,
  ) {
    return this.commissionService.createRule(companyId, userId, dto);
  }

  @Post(':id/approve')
  @RequirePermission(PERMISSIONS.COMMISSION_APPROVE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve earned commission and post COMMISSION_APPROVED journal' })
  async approveCommission(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.commissionService.approveCommission(companyId, userId, id);
  }

  @Post(':id/pay')
  @RequirePermission(PERMISSIONS.COMMISSION_PAY)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pay approved commission and post COMMISSION_PAID journal' })
  async payCommission(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto?: PayCommissionDto,
  ) {
    return this.commissionService.payCommission(companyId, userId, id, dto);
  }

  @Post('bookings/:bookingId/accrue')
  @RequirePermission(PERMISSIONS.COMMISSION_CREATE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accrue earned commission on booking confirmation (no journal)' })
  async accrueCommission(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('bookingId') bookingId: string,
  ) {
    return this.commissionService.accrueCommissionOnConfirmation(companyId, userId, bookingId);
  }
}
