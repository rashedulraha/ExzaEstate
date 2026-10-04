import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { TenantProvisioningModule } from '../../platform/tenant-provisioning/tenant-provisioning.module.js';
import { SystemJwtAuthGuard } from './guards/system-jwt-auth.guard.js';
import { SystemAuthController } from './system-auth.controller.js';
import { SystemAuthService } from './system-auth.service.js';
import { SystemHealthController } from './system-health.controller.js';
import { SystemHealthService } from './system-health.service.js';
import { SystemTenantController } from './system-tenant.controller.js';
import { SystemTenantService } from './system-tenant.service.js';
import { TenantImportController } from './tenant-import.controller.js';
import { TenantImportService } from './tenant-import.service.js';

@Module({
  imports: [DatabaseModule, TenantProvisioningModule],
  controllers: [
    SystemAuthController,
    SystemTenantController,
    SystemHealthController,
    TenantImportController,
  ],
  providers: [
    SystemAuthService,
    SystemTenantService,
    SystemHealthService,
    SystemJwtAuthGuard,
    TenantImportService,
  ],
  exports: [
    SystemAuthService,
    SystemTenantService,
    SystemHealthService,
    SystemJwtAuthGuard,
    TenantImportService,
  ],
})
export class SystemAdminModule {}
