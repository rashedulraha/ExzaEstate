import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { TenantProvisioningModule } from '../../platform/tenant-provisioning/tenant-provisioning.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { LicenseModule } from '../license/license.module.js';
import { LocalBackupService } from './local-backup.service.js';
import { LocalDataController } from './local-data.controller.js';
import { LocalExportService } from './local-export.service.js';
import { LocalProvisioningService } from './local-provisioning.service.js';

@Module({
  imports: [DatabaseModule, TenantProvisioningModule, AuthModule, LicenseModule],
  controllers: [LocalDataController],
  providers: [LocalBackupService, LocalExportService, LocalProvisioningService],
  exports: [LocalBackupService, LocalExportService, LocalProvisioningService],
})
export class LocalDataModule {}
