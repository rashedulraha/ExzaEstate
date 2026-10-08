import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { PERMISSIONS } from '@exzaestate/shared';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { QueryReceiptsDto, ReceiptResponseDto } from './dto/receipt-response.dto.js';
import { ReceiptService } from './receipt.service.js';

@ApiTags('Collection - Receipts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('collection/receipts')
export class ReceiptController {
  constructor(private readonly receiptService: ReceiptService) {}

  @Get()
  @RequirePermission(PERMISSIONS.PAYMENT_VIEW)
  @ApiOperation({ summary: 'List and query money receipts' })
  async listReceipts(
    @CurrentUser('companyId') companyId: string,
    @Query() query: QueryReceiptsDto,
  ): Promise<{ items: ReceiptResponseDto[]; total: number; page: number; limit: number }> {
    return this.receiptService.listReceipts(companyId, query);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.PAYMENT_VIEW)
  @ApiOperation({ summary: 'Get receipt by ID' })
  async getReceiptById(
    @CurrentUser('companyId') companyId: string,
    @Param('id') receiptId: string,
  ): Promise<ReceiptResponseDto> {
    return this.receiptService.getReceiptById(companyId, receiptId);
  }

  @Get(':id/pdf')
  @RequirePermission(PERMISSIONS.PAYMENT_VIEW)
  @ApiOperation({ summary: 'Generate Money Receipt PDF in English or Bengali (AT-39)' })
  @ApiQuery({
    name: 'lang',
    required: false,
    enum: ['en', 'bn'],
    description: 'Language: en (default) or bn',
  })
  @ApiResponse({ status: 200, description: 'Receipt PDF buffer' })
  async downloadReceiptPdf(
    @CurrentUser('companyId') companyId: string,
    @Param('id') receiptId: string,
    @Query('lang') lang: 'en' | 'bn' = 'en',
    @Res() res: Response,
  ): Promise<void> {
    const pdfBuffer = await this.receiptService.generateReceiptPdf(companyId, receiptId, lang);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="receipt-${receiptId}.pdf"`);
    res.send(pdfBuffer);
  }

  @Post(':id/reprint')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.PAYMENT_VIEW)
  @ApiOperation({ summary: 'Reprint receipt with Duplicate copy tracking' })
  async reprintReceipt(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') receiptId: string,
  ): Promise<ReceiptResponseDto> {
    return this.receiptService.reprintReceipt(companyId, userId, receiptId);
  }
}
