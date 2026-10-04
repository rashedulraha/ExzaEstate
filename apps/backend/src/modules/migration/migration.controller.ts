import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@exzaestate/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import {
  AddLegacyBookingDto,
  CreateMigrationBatchDto,
  FinalizeMigrationBatchDto,
  MigrationBatchResponseDto,
  PostOpeningBalanceDto,
  ReconciliationGateResponseDto,
} from './dto/migration.dto.js';
import { MigrationService } from './migration.service.js';

@ApiTags('Operations - Go-Live Migration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('migration/batches')
export class MigrationController {
  constructor(private readonly migrationService: MigrationService) {}

  @Post()
  @RequirePermission(PERMISSIONS.SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Create a new go-live migration batch' })
  async createBatch(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateMigrationBatchDto,
  ): Promise<MigrationBatchResponseDto> {
    return this.migrationService.createBatch(companyId, userId, dto);
  }

  @Post(':batchId/opening-balance')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Post opening balance journal for the batch' })
  async postOpeningBalance(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('batchId') batchId: string,
    @Body() dto: PostOpeningBalanceDto,
  ): Promise<{ journalId: string; totalAmountPaisa: string }> {
    return this.migrationService.postOpeningBalance(companyId, userId, batchId, dto);
  }

  @Post(':batchId/legacy-bookings')
  @RequirePermission(PERMISSIONS.SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Add a legacy booking record to the migration batch' })
  async addLegacyBooking(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('batchId') batchId: string,
    @Body() dto: AddLegacyBookingDto,
  ): Promise<{ id: string; legacyBookingNo: string; outstandingPaisa: string }> {
    return this.migrationService.addLegacyBooking(companyId, userId, batchId, dto);
  }

  @Get(':batchId/reconciliation')
  @RequirePermission(PERMISSIONS.SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Evaluate reconciliation gate (Opening AR vs Σ Legacy Outstanding)' })
  async getReconciliationGate(
    @CurrentUser('companyId') companyId: string,
    @Param('batchId') batchId: string,
  ): Promise<ReconciliationGateResponseDto> {
    return this.migrationService.getReconciliationGate(companyId, batchId);
  }

  @Post(':batchId/finalize')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Finalize and lock the migration batch (enforces reconciliation gate)' })
  async finalizeBatch(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('batchId') batchId: string,
    @Body() dto: FinalizeMigrationBatchDto,
  ): Promise<MigrationBatchResponseDto> {
    return this.migrationService.finalizeBatch(companyId, userId, batchId, dto);
  }
}
