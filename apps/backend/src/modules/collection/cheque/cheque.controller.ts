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
import { PaymentResponseDto } from '../dto/index.js';
import { BounceChequeDto, ChequeEventResponseDto, ClearChequeDto } from './dto/index.js';
import { ChequeService } from './cheque.service.js';

@ApiTags('Collection - Cheques')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('collection/cheques')
export class ChequeController {
  constructor(private readonly chequeService: ChequeService) {}

  @Post(':paymentId/clear')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.PAYMENT_POST)
  @ApiOperation({ summary: 'Clear a received cheque, post accounting, issue receipt' })
  async clearCheque(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('paymentId') paymentId: string,
    @Body() dto: ClearChequeDto,
  ): Promise<PaymentResponseDto> {
    return this.chequeService.clearCheque(companyId, userId, paymentId, dto);
  }

  @Post(':paymentId/bounce')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.PAYMENT_POST)
  @ApiOperation({ summary: 'Mark a cheque payment as bounced and cancel the payment' })
  async bounceCheque(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('paymentId') paymentId: string,
    @Body() dto: BounceChequeDto,
  ): Promise<PaymentResponseDto> {
    return this.chequeService.bounceCheque(companyId, userId, paymentId, dto);
  }

  @Get(':paymentId/events')
  @RequirePermission(PERMISSIONS.PAYMENT_VIEW)
  @ApiOperation({ summary: 'Get audit history of cheque events for a payment' })
  async getChequeEvents(
    @CurrentUser('companyId') companyId: string,
    @Param('paymentId') paymentId: string,
  ): Promise<ChequeEventResponseDto[]> {
    return this.chequeService.getChequeEvents(companyId, paymentId);
  }
}
