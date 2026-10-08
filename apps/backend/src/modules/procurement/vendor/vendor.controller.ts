import {
  Body,
  Controller,
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
import { VendorService } from './vendor.service.js';
import { CreateVendorDto, UpdateVendorDto, VendorQueryDto } from '../dto/index.js';

@ApiTags('Vendors')
@ApiBearerAuth()
@Controller('vendors')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  @Post()
  @RequirePermission(PERMISSIONS.VENDOR_CREATE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new vendor' })
  async createVendor(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateVendorDto,
  ) {
    return this.vendorService.createVendor(companyId, userId, dto);
  }

  @Get()
  @RequirePermission(PERMISSIONS.VENDOR_VIEW)
  @ApiOperation({ summary: 'List vendors with optional search filter' })
  async listVendors(@CurrentUser('companyId') companyId: string, @Query() query: VendorQueryDto) {
    return this.vendorService.listVendors(companyId, query);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.VENDOR_VIEW)
  @ApiOperation({ summary: 'Get vendor details by ID' })
  async getVendor(@CurrentUser('companyId') companyId: string, @Param('id') id: string) {
    return this.vendorService.getVendorById(companyId, id);
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.VENDOR_EDIT)
  @ApiOperation({ summary: 'Update vendor profile' })
  async updateVendor(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateVendorDto,
  ) {
    return this.vendorService.updateVendor(companyId, userId, id, dto);
  }
}
