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
  CalculateChargesDto,
  ChargeCalculationSummaryResponseDto,
  ChargeTypeListResponseDto,
  ChargeTypeResponseDto,
  CreateChargeTypeDto,
  QueryChargeTypesDto,
  UpdateChargeTypeDto,
} from '../dto/index.js';
import { ChargeService } from './charge.service.js';

@ApiTags('Sales - Charge Types & Fees')
@ApiBearerAuth()
@Controller('sales/charges')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ChargeController {
  constructor(private readonly chargeService: ChargeService) {}

  @Post('calculate')
  @RequirePermission(PERMISSIONS.QUOTATION_VIEW)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Calculate itemised charges on net property price with configurable VAT and totals',
  })
  async calculateCharges(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CalculateChargesDto,
  ): Promise<ChargeCalculationSummaryResponseDto> {
    return this.chargeService.calculateCharges(companyId, dto);
  }

  @Get()
  @RequirePermission(PERMISSIONS.QUOTATION_VIEW)
  @ApiOperation({ summary: 'List charge types catalogue with filtering and search' })
  async getChargeTypes(
    @CurrentUser('companyId') companyId: string,
    @Query() query: QueryChargeTypesDto,
  ): Promise<ChargeTypeListResponseDto> {
    return this.chargeService.getChargeTypes(companyId, query);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.QUOTATION_VIEW)
  @ApiOperation({ summary: 'Get charge type details by ID' })
  async getChargeTypeById(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ): Promise<ChargeTypeResponseDto> {
    return this.chargeService.getChargeTypeById(companyId, id);
  }

  @Post()
  @RequirePermission(PERMISSIONS.SETTINGS_EDIT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new charge type in catalogue (Admin / MD)' })
  async createChargeType(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateChargeTypeDto,
  ): Promise<ChargeTypeResponseDto> {
    return this.chargeService.createChargeType(companyId, dto, userId);
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.SETTINGS_EDIT)
  @ApiOperation({ summary: 'Update charge type configuration' })
  async updateChargeType(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateChargeTypeDto,
  ): Promise<ChargeTypeResponseDto> {
    return this.chargeService.updateChargeType(companyId, id, dto, userId);
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.SETTINGS_EDIT)
  @ApiOperation({ summary: 'Soft delete charge type' })
  async deleteChargeType(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ): Promise<{ success: boolean; id: string }> {
    return this.chargeService.deleteChargeType(companyId, id, userId);
  }
}
