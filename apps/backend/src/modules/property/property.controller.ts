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
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { CreatePropertyDto } from './dto/create-property.dto.js';
import { PricingPreviewDto } from './dto/pricing-preview.dto.js';
import { QueryPropertyDto } from './dto/query-property.dto.js';
import { BlockPropertyDto, HoldPropertyDto, StatusOverrideDto } from './dto/status-action.dto.js';
import { UpdatePropertyDto } from './dto/update-property.dto.js';
import { PropertyPricingService } from './property-pricing.service.js';
import { PropertyStatusService } from './property-status.service.js';
import { PropertyService } from './property.service.js';

@ApiTags('Properties')
@ApiBearerAuth()
@Controller('properties')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PropertyController {
  constructor(
    private readonly propertyService: PropertyService,
    private readonly propertyStatusService: PropertyStatusService,
    private readonly pricingService: PropertyPricingService,
  ) {}

  @Post()
  @RequirePermission(PERMISSIONS.PROPERTY_CREATE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new property unit in a project' })
  async createProperty(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreatePropertyDto,
  ) {
    return this.propertyService.createProperty(companyId, dto, userId);
  }

  @Get()
  @RequirePermission(PERMISSIONS.PROPERTY_VIEW)
  @ApiOperation({
    summary:
      'List properties with allowlist filtering and pagination. Serving index: @@index([company_id, project_id]), @@index([company_id, status]), @@index([company_id, type])',
  })
  async listProperties(
    @CurrentUser('companyId') companyId: string,
    @Query() query: QueryPropertyDto,
  ) {
    return this.propertyService.listProperties(companyId, query);
  }

  @Post('pricing-preview')
  @RequirePermission(PERMISSIONS.PROPERTY_VIEW)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Preview net price breakdown without persisting (base + premium - discount + charges = net)',
  })
  async previewPricing(@Body() dto: PricingPreviewDto) {
    return this.pricingService.previewPricing(dto);
  }

  @Get(':id/history')
  @RequirePermission(PERMISSIONS.PROPERTY_VIEW)
  @ApiOperation({
    summary: 'Get full status transition history (who/what/when/why) for a property',
  })
  async getStatusHistory(@CurrentUser('companyId') companyId: string, @Param('id') id: string) {
    return this.propertyStatusService.getStatusHistory(companyId, id);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.PROPERTY_VIEW)
  @ApiOperation({ summary: 'Get property detail by ID with block and floor details' })
  async getPropertyById(@CurrentUser('companyId') companyId: string, @Param('id') id: string) {
    return this.propertyService.getPropertyById(companyId, id);
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.PROPERTY_EDIT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Update property details (status updates are forbidden here - use workflow actions or override)',
  })
  async updateProperty(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePropertyDto,
  ) {
    return this.propertyService.updateProperty(companyId, id, dto, userId);
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.PROPERTY_DELETE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Soft delete a property unit (prohibited if unit is Booked, Sold, or Reserved)',
  })
  async deleteProperty(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    await this.propertyService.deleteProperty(companyId, id, userId);
    return { message: 'Property deleted successfully' };
  }

  @Post(':id/hold')
  @RequirePermission(PERMISSIONS.PROPERTY_EDIT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Place an Available property on management hold with optional expiry' })
  async holdProperty(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: HoldPropertyDto,
  ) {
    return this.propertyStatusService.holdProperty(companyId, id, dto, userId);
  }

  @Post(':id/release-hold')
  @RequirePermission(PERMISSIONS.PROPERTY_EDIT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Release management hold and return property to Available' })
  async releaseHold(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.propertyStatusService.releaseHold(companyId, id, userId);
  }

  @Post(':id/block')
  @RequirePermission(PERMISSIONS.PROPERTY_EDIT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Block a property unit from sale with mandatory reason' })
  async blockProperty(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: BlockPropertyDto,
  ) {
    return this.propertyStatusService.blockProperty(companyId, id, dto, userId);
  }

  @Post(':id/unblock')
  @RequirePermission(PERMISSIONS.PROPERTY_EDIT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unblock property and return unit to Available' })
  async unblockProperty(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.propertyStatusService.unblockProperty(companyId, id, userId);
  }

  @Patch(':id/status/override')
  @RequirePermission(PERMISSIONS.PROPERTY_OVERRIDE_STATUS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Manual status override with mandatory reason and STATUS_OVERRIDE audit [RULE-PROPERTY-STATUS]',
  })
  async overrideStatus(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: StatusOverrideDto,
  ) {
    return this.propertyStatusService.overrideStatus(companyId, id, dto, userId);
  }
}
