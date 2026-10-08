import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
import { GoodsReceiptService } from './goods-receipt.service.js';
import { CreateGoodsReceiptDto, ProcurementQueryDto } from '../dto/index.js';

@ApiTags('Procurement - Goods Receipts (GRN)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('procurement/goods-receipts')
export class GoodsReceiptController {
  constructor(private readonly grnService: GoodsReceiptService) {}

  @Post()
  @RequirePermission(PERMISSIONS.PROCUREMENT_CREATE)
  @ApiOperation({ summary: 'Create and record a new Goods Receipt Note (GRN)' })
  async create(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateGoodsReceiptDto,
  ) {
    return this.grnService.create(companyId, userId, dto);
  }

  @Get()
  @RequirePermission(PERMISSIONS.PROCUREMENT_VIEW)
  @ApiOperation({ summary: 'List goods receipt notes' })
  async findAll(@CurrentUser('companyId') companyId: string, @Query() query: ProcurementQueryDto) {
    return this.grnService.findAll(companyId, query);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.PROCUREMENT_VIEW)
  @ApiOperation({ summary: 'Get goods receipt note details by ID' })
  async findById(
    @CurrentUser('companyId') companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.grnService.findById(companyId, id);
  }

  @Post(':id/create-bill')
  @RequirePermission(PERMISSIONS.VENDOR_BILL_CREATE)
  @ApiOperation({ summary: 'Generate a draft Vendor Bill from a Goods Receipt (3-Way Matching)' })
  async createBill(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.grnService.createBillFromGrn(companyId, userId, id);
  }
}
