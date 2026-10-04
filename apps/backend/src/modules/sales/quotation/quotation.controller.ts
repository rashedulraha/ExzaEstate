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
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { PERMISSIONS } from '@exzaestate/shared';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import {
  CreateQuotationDto,
  QueryQuotationsDto,
  QuotationListResponseDto,
  QuotationResponseDto,
  UpdateQuotationDto,
} from '../dto/index.js';
import { QuotationService } from './quotation.service.js';

@ApiTags('Sales - Quotations')
@ApiBearerAuth()
@Controller('sales/quotations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class QuotationController {
  constructor(private readonly quotationService: QuotationService) {}

  @Post()
  @RequirePermission(PERMISSIONS.QUOTATION_CREATE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new property quotation with pricing and payment schedule' })
  async createQuotation(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateQuotationDto,
  ): Promise<QuotationResponseDto> {
    return this.quotationService.createQuotation(companyId, dto, userId);
  }

  @Get()
  @RequirePermission(PERMISSIONS.QUOTATION_VIEW)
  @ApiOperation({ summary: 'List quotations with filtering, pagination and search' })
  async getQuotations(
    @CurrentUser('companyId') companyId: string,
    @Query() query: QueryQuotationsDto,
  ): Promise<QuotationListResponseDto> {
    return this.quotationService.getQuotations(companyId, query);
  }

  @Post('check-expiry')
  @RequirePermission(PERMISSIONS.QUOTATION_VIEW)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Trigger background or on-demand check to mark overdue quotations Expired',
  })
  async checkExpiry(
    @CurrentUser('companyId') companyId: string,
  ): Promise<{ expiredCount: number }> {
    return this.quotationService.expireOverdueQuotations(companyId);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.QUOTATION_VIEW)
  @ApiOperation({ summary: 'Get quotation details by ID' })
  async getQuotationById(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ): Promise<QuotationResponseDto> {
    return this.quotationService.getQuotationById(companyId, id);
  }

  @Get(':id/pdf')
  @RequirePermission(PERMISSIONS.QUOTATION_VIEW)
  @ApiOperation({ summary: 'Download or view branded institutional Quotation PDF' })
  async downloadPdf(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.quotationService.generatePdf(companyId, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Quotation-${id}.pdf"`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.QUOTATION_EDIT)
  @ApiOperation({ summary: 'Update Draft quotation settings or validity date' })
  async updateQuotation(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateQuotationDto,
  ): Promise<QuotationResponseDto> {
    return this.quotationService.updateQuotation(companyId, id, dto, userId);
  }

  @Post(':id/send')
  @RequirePermission(PERMISSIONS.QUOTATION_EDIT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark quotation as Sent to prospective client' })
  async sendQuotation(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ): Promise<QuotationResponseDto> {
    return this.quotationService.sendQuotation(companyId, id, userId);
  }

  @Post(':id/approve')
  @RequirePermission(PERMISSIONS.QUOTATION_APPROVE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve quotation discount and terms (MD / GM)' })
  async approveQuotation(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ): Promise<QuotationResponseDto> {
    return this.quotationService.approveQuotation(companyId, id, userId);
  }

  @Post(':id/reject')
  @RequirePermission(PERMISSIONS.QUOTATION_REJECT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject quotation with mandatory reason' })
  async rejectQuotation(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ): Promise<QuotationResponseDto> {
    return this.quotationService.rejectQuotation(
      companyId,
      id,
      reason || 'Rejected by management',
      userId,
    );
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.QUOTATION_EDIT)
  @ApiOperation({ summary: 'Soft delete a Draft quotation' })
  async deleteQuotation(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ): Promise<{ success: boolean; id: string }> {
    return this.quotationService.deleteQuotation(companyId, id, userId);
  }
}
