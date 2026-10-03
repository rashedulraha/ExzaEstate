import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { CompanyBranchStep } from './steps/company-branch.step.js';
import { RolesPermissionsStep } from './steps/roles-permissions.step.js';
import { ManagingDirectorStep } from './steps/managing-director.step.js';
import { TenantProvisioningService } from './tenant-provisioning.service.js';
import { DemoStaffStep } from './demo-seed/steps/demo-staff.step.js';
import { DemoSeedService } from './demo-seed/demo-seed.service.js';

@Module({
  imports: [DatabaseModule],
  providers: [
    CompanyBranchStep,
    RolesPermissionsStep,
    ManagingDirectorStep,
    TenantProvisioningService,
    DemoStaffStep,
    DemoSeedService,
  ],
  exports: [
    TenantProvisioningService,
    CompanyBranchStep,
    RolesPermissionsStep,
    ManagingDirectorStep,
    DemoStaffStep,
    DemoSeedService,
  ],
})
export class TenantProvisioningModule {}
