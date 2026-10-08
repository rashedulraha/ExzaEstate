import { Body, Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@exzaestate/shared';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { PaymentReversalResponseDto, ReversePaymentDto } from './dto/reverse-payment.dto.js';
import { ReversalService } from './reversal.service.js';

@ApiTags('Collection - Reversals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('collection/payments')
export class ReversalController {
  constructor(private readonly reversalService: ReversalService) {}

  @Post(':id/reverse')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.PAYMENT_REVERSE)
  @ApiOperation({ summary: 'Reverse a posted payment, void receipt and re-open installments' })
  async reversePayment(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') paymentId: string,
    @Body() dto: ReversePaymentDto,
  ): Promise<PaymentReversalResponseDto> {
    return this.reversalService.reversePayment(companyId, userId, paymentId, dto);
  }
}
