import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@exzaestate/shared';
import { Public } from '../../common/decorators/public.decorator.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import {
  CreateLocalBackupDto,
  LocalBackupStatusResponseDto,
  LocalProvisioningDto,
  RestoreLocalBackupDto,
} from './dto/local-data.dto.js';
import { LocalBackupService } from './local-backup.service.js';
import { LocalExportService } from './local-export.service.js';
import { LocalProvisioningService } from './local-provisioning.service.js';

@ApiTags('Local Standalone Data Lifecycle')
@ApiBearerAuth()
@Controller('local-data')
export class LocalDataController {
  constructor(
    private readonly backupService: LocalBackupService,
    private readonly exportService: LocalExportService,
    private readonly provisioningService: LocalProvisioningService,
  ) {}

  @Public()
  @Post('provision')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Provision first-launch company and administrator for standalone local mode',
  })
  async provision(@Body() dto: LocalProvisioningDto) {
    return this.provisioningService.provisionLocalStandalone(dto);
  }

  @Public()
  @Get('is-provisioned')
  @ApiOperation({ summary: 'Check if the local standalone company has already been provisioned' })
  async isProvisioned() {
    const provisioned = await this.provisioningService.isProvisioned();
    return { provisioned };
  }

  @Post('backup')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(PERMISSIONS.DATA_BACKUP)
  @ApiOperation({ summary: 'Trigger manual local backup (.exzabackup)' })
  async createBackup(@Body() dto: CreateLocalBackupDto) {
    return this.backupService.createBackup(dto);
  }

  @Post('restore')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.DATA_RESTORE)
  @ApiOperation({ summary: 'Restore standalone database from a backup bundle' })
  async restoreBackup(@Body() dto: RestoreLocalBackupDto) {
    return this.backupService.restoreBackup(dto.backupFilePath);
  }

  @Get('status')
  @RequirePermission(PERMISSIONS.DATA_BACKUP)
  @ApiOperation({ summary: 'Get backup health status and 7-day warning banner' })
  @ApiResponse({ status: 200, type: LocalBackupStatusResponseDto })
  async getStatus(): Promise<LocalBackupStatusResponseDto> {
    return this.backupService.getBackupStatus();
  }

  @Get('export')
  @RequirePermission(PERMISSIONS.DATA_EXPORT)
  @ApiOperation({
    summary: 'Export all company data (.exzaexport + CSV). Unblocked even if license is expired.',
  })
  async exportAll() {
    return this.exportService.exportCompanyBundle();
  }
}
