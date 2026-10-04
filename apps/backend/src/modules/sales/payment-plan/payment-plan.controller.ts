import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import {
  CreatePaymentPlanTemplateDto,
  PaymentPlanTemplateListResponseDto,
  PaymentPlanTemplateResponseDto,
  PreviewScheduleDto,
  QueryPaymentPlanTemplatesDto,
  SchedulePreviewResponseDto,
  UpdatePaymentPlanTemplateDto,
} from '../dto/index.js';
import { PaymentPlanService } from './payment-plan.service.js';

@ApiTags('Sales - Payment Plans')
@ApiBearerAuth()
@Controller('sales/payment-plans')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PaymentPlanController {
  constructor(private readonly paymentPlanService: PaymentPlanService) {}

  @Post('preview')
  @RequirePermission(PERMISSIONS.QUOTATION_VIEW)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Preview calculated installment schedule from price parameters or template (AT-23 largest-remainder engine)',
  })
  async previewSchedule(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: PreviewScheduleDto,
  ): Promise<SchedulePreviewResponseDto> {
    return this.paymentPlanService.previewSchedule(companyId, dto);
  }

  @Get()
  @RequirePermission(PERMISSIONS.QUOTATION_VIEW)
  @ApiOperation({ summary: 'List configured payment plan templates' })
  async getTemplates(
    @CurrentUser('companyId') companyId: string,
    @Query() query: QueryPaymentPlanTemplatesDto,
  ): Promise<PaymentPlanTemplateListResponseDto> {
    return this.paymentPlanService.getTemplates(companyId, query);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.QUOTATION_VIEW)
  @ApiOperation({ summary: 'Get payment plan template details by ID' })
  async getTemplateById(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ): Promise<PaymentPlanTemplateResponseDto> {
    return this.paymentPlanService.getTemplateById(companyId, id);
  }

  @Post()
  @RequirePermission(PERMISSIONS.SETTINGS_EDIT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new payment plan template (Admin / MD)' })
  async createTemplate(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreatePaymentPlanTemplateDto,
  ): Promise<PaymentPlanTemplateResponseDto> {
    return this.paymentPlanService.createTemplate(companyId, dto, userId);
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.SETTINGS_EDIT)
  @ApiOperation({ summary: 'Update payment plan template settings' })
  async updateTemplate(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePaymentPlanTemplateDto,
  ): Promise<PaymentPlanTemplateResponseDto> {
    return this.paymentPlanService.updateTemplate(companyId, id, dto, userId);
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.SETTINGS_EDIT)
  @ApiOperation({ summary: 'Soft delete payment plan template' })
  async deleteTemplate(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ): Promise<{ success: boolean; id: string }> {
    return this.paymentPlanService.deleteTemplate(companyId, id, userId);
  }
}
