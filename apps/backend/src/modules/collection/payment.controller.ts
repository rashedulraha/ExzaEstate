import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@exzaestate/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import type {
  CreateDraftPaymentDto,
  PaymentResponseDto,
  PostPaymentDto,
  QueryPaymentsDto,
} from './dto/index.js';
import { PaymentService } from './payment.service.js';

@ApiTags('Collection - Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('collection/payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('draft')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(PERMISSIONS.PAYMENT_CREATE_DRAFT)
  @ApiOperation({ summary: 'Submit a draft booking money / collection payment request' })
  @ApiHeader({ name: 'Idempotency-Key', required: false })
  async createDraftPayment(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateDraftPaymentDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<PaymentResponseDto> {
    return this.paymentService.createDraftPayment(companyId, userId, dto, idempotencyKey);
  }

  @Post(':id/post')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.PAYMENT_POST)
  @ApiOperation({ summary: 'Post a payment to confirm receipt and lock immutably' })
  @ApiHeader({ name: 'Idempotency-Key', required: false })
  async postPayment(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') paymentId: string,
    @Body() dto: PostPaymentDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<PaymentResponseDto> {
    return this.paymentService.postPayment(companyId, userId, paymentId, dto, idempotencyKey);
  }

  @Get()
  @RequirePermission(PERMISSIONS.PAYMENT_VIEW)
  @ApiOperation({ summary: 'List payments with filtering and pagination' })
  async listPayments(
    @CurrentUser('companyId') companyId: string,
    @Query() query: QueryPaymentsDto,
  ): Promise<{ items: PaymentResponseDto[]; total: number; page: number; limit: number }> {
    return this.paymentService.listPayments(companyId, query);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.PAYMENT_VIEW)
  @ApiOperation({ summary: 'Get payment details by ID' })
  async getPaymentById(
    @CurrentUser('companyId') companyId: string,
    @Param('id') paymentId: string,
  ): Promise<PaymentResponseDto> {
    return this.paymentService.getPaymentById(companyId, paymentId);
  }
}
