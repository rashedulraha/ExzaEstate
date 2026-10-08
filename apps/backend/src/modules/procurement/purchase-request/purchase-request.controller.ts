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
import { PurchaseRequestService } from './purchase-request.service.js';
import {
  CreatePurchaseRequestDto,
  UpdatePurchaseRequestDto,
  RejectPurchaseRequestDto,
  ConvertPrToPoDto,
  ProcurementQueryDto,
} from '../dto/index.js';

@ApiTags('Procurement - Purchase Requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('procurement/purchase-requests')
export class PurchaseRequestController {
  constructor(private readonly prService: PurchaseRequestService) {}

  @Post()
  @RequirePermission(PERMISSIONS.PROCUREMENT_CREATE)
  @ApiOperation({ summary: 'Create a new purchase request' })
  async create(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreatePurchaseRequestDto,
  ) {
    return this.prService.create(companyId, userId, dto);
  }

  @Get()
  @RequirePermission(PERMISSIONS.PROCUREMENT_VIEW)
  @ApiOperation({ summary: 'List purchase requests' })
  async findAll(@CurrentUser('companyId') companyId: string, @Query() query: ProcurementQueryDto) {
    return this.prService.findAll(companyId, query);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.PROCUREMENT_VIEW)
  @ApiOperation({ summary: 'Get purchase request details by ID' })
  async findById(
    @CurrentUser('companyId') companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.prService.findById(companyId, id);
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.PROCUREMENT_EDIT)
  @ApiOperation({ summary: 'Update a draft purchase request' })
  async update(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePurchaseRequestDto,
  ) {
    return this.prService.update(companyId, userId, id, dto);
  }

  @Post(':id/submit')
  @RequirePermission(PERMISSIONS.PROCUREMENT_EDIT)
  @ApiOperation({ summary: 'Submit draft purchase request for approval' })
  async submit(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.prService.submit(companyId, userId, id);
  }

  @Post(':id/approve')
  @RequirePermission(PERMISSIONS.PROCUREMENT_APPROVE)
  @ApiOperation({ summary: 'Approve a purchase request' })
  async approve(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.prService.approve(companyId, userId, id);
  }

  @Post(':id/reject')
  @RequirePermission(PERMISSIONS.PROCUREMENT_REJECT)
  @ApiOperation({ summary: 'Reject a purchase request with reason' })
  async reject(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectPurchaseRequestDto,
  ) {
    return this.prService.reject(companyId, userId, id, dto.reason);
  }

  @Post(':id/convert-to-po')
  @RequirePermission(PERMISSIONS.PROCUREMENT_CREATE)
  @ApiOperation({ summary: 'Convert an approved purchase request to a Purchase Order' })
  async convertToPo(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConvertPrToPoDto,
  ) {
    return this.prService.convertToPo(companyId, userId, id, dto);
  }
}
