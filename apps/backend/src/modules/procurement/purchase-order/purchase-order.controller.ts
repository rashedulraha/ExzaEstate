import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
import { PurchaseOrderService } from './purchase-order.service.js';
import {
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
  ProcurementQueryDto,
} from '../dto/index.js';

@ApiTags('Procurement - Purchase Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('procurement/purchase-orders')
export class PurchaseOrderController {
  constructor(private readonly poService: PurchaseOrderService) {}

  @Post()
  @RequirePermission(PERMISSIONS.PROCUREMENT_CREATE)
  @ApiOperation({ summary: 'Create a new purchase order' })
  async create(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreatePurchaseOrderDto,
  ) {
    return this.poService.create(companyId, userId, dto);
  }

  @Get()
  @RequirePermission(PERMISSIONS.PROCUREMENT_VIEW)
  @ApiOperation({ summary: 'List purchase orders' })
  async findAll(@CurrentUser('companyId') companyId: string, @Query() query: ProcurementQueryDto) {
    return this.poService.findAll(companyId, query);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.PROCUREMENT_VIEW)
  @ApiOperation({ summary: 'Get purchase order details by ID' })
  async findById(
    @CurrentUser('companyId') companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.poService.findById(companyId, id);
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.PROCUREMENT_EDIT)
  @ApiOperation({ summary: 'Update a purchase order' })
  async update(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePurchaseOrderDto,
  ) {
    return this.poService.update(companyId, userId, id, dto);
  }

  @Post(':id/cancel')
  @RequirePermission(PERMISSIONS.PROCUREMENT_EDIT)
  @ApiOperation({ summary: 'Cancel a purchase order' })
  async cancel(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.poService.cancel(companyId, userId, id);
  }

  @Post(':id/close')
  @RequirePermission(PERMISSIONS.PROCUREMENT_EDIT)
  @ApiOperation({ summary: 'Close a fulfilled or completed purchase order' })
  async close(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.poService.close(companyId, userId, id);
  }
}
