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
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@exzaestate/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import {
  CreateLandDto,
  QueryLandDto,
  UpdateLandDto,
  UpdateLandFactorsDto,
} from './dto/land.dto.js';
import { LandService } from './land.service.js';

@ApiTags('Lands')
@ApiBearerAuth()
@Controller('lands')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LandController {
  constructor(private readonly landService: LandService) {}

  @Post()
  @RequirePermission(PERMISSIONS.LAND_CREATE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create land parcel with area conversion' })
  async createLand(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateLandDto,
  ) {
    return this.landService.createLand(companyId, dto, userId);
  }

  @Get()
  @RequirePermission(PERMISSIONS.LAND_VIEW)
  @ApiOperation({ summary: 'List land parcels with filters and pagination' })
  async listLands(@CurrentUser('companyId') companyId: string, @Query() query: QueryLandDto) {
    return this.landService.listLands(companyId, query);
  }

  @Get('factors')
  @RequirePermission(PERMISSIONS.LAND_VIEW)
  @ApiOperation({ summary: 'Get current company land unit factors' })
  async getLandFactors(@CurrentUser('companyId') companyId: string) {
    return this.landService.getLandFactors(companyId);
  }

  @Put('factors')
  @RequirePermission(PERMISSIONS.LAND_EDIT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update company land unit factors' })
  async updateLandFactors(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateLandFactorsDto,
  ) {
    return this.landService.updateCompanyLandFactors(companyId, dto, userId);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.LAND_VIEW)
  @ApiOperation({ summary: 'Get land parcel details by ID' })
  async getLandById(@CurrentUser('companyId') companyId: string, @Param('id') id: string) {
    return this.landService.getLandById(companyId, id);
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.LAND_EDIT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update land parcel details' })
  async updateLand(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLandDto,
  ) {
    return this.landService.updateLand(companyId, id, dto, userId);
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.LAND_DELETE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete land parcel' })
  async deleteLand(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    await this.landService.deleteLand(companyId, id, userId);
    return { message: 'Land parcel deleted successfully' };
  }
}
