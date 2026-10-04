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
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { ChargeLateFeeDto, LateFeeResponseDto, WaiveLateFeeDto } from './dto/late-fee.dto.js';
import { LateFeeService } from './late-fee.service.js';

@ApiTags('Collection - Late Fees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('collection/late-fees')
export class LateFeeController {
  constructor(private readonly lateFeeService: LateFeeService) {}

  @Post('installments/:installmentId/charge')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.PAYMENT_POST)
  @ApiOperation({ summary: 'Calculate and charge late fee for an overdue installment' })
  async chargeLateFee(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('installmentId') installmentId: string,
    @Body() dto: ChargeLateFeeDto,
  ): Promise<LateFeeResponseDto | null> {
    return this.lateFeeService.chargeLateFee(companyId, userId, installmentId, dto);
  }

  @Post(':id/waive')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.PAYMENT_REVERSE)
  @ApiOperation({ summary: 'Waive charged late fee' })
  async waiveLateFee(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') lateFeeRecordId: string,
    @Body() dto: WaiveLateFeeDto,
  ): Promise<LateFeeResponseDto> {
    return this.lateFeeService.waiveLateFee(companyId, userId, lateFeeRecordId, dto);
  }
}
