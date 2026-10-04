import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { CompanyBranchStep } from './steps/company-branch.step.js';
import { RolesPermissionsStep } from './steps/roles-permissions.step.js';
import { ManagingDirectorStep } from './steps/managing-director.step.js';
import { DefaultDepartmentsStep } from './steps/default-departments.step.js';
import { DefaultSettingsStep } from './steps/default-settings.step.js';
import { DefaultNumberingStep } from './steps/default-numbering.step.js';
import { DefaultTemplatesStep } from './steps/default-templates.step.js';
import { TenantProvisioningService } from './tenant-provisioning.service.js';
import { DemoStaffStep } from './demo-seed/steps/demo-staff.step.js';
import { DemoLandStep } from './demo-seed/steps/demo-land.step.js';
import { DemoProjectStep } from './demo-seed/steps/demo-project.step.js';
import { DemoPropertyStep } from './demo-seed/steps/demo-property.step.js';
import { DemoSeedService } from './demo-seed/demo-seed.service.js';

@Module({
  imports: [DatabaseModule],
  providers: [
    CompanyBranchStep,
    RolesPermissionsStep,
    ManagingDirectorStep,
    DefaultDepartmentsStep,
    DefaultSettingsStep,
    DefaultNumberingStep,
    DefaultTemplatesStep,
    TenantProvisioningService,
    DemoStaffStep,
    DemoLandStep,
    DemoProjectStep,
    DemoPropertyStep,
    DemoSeedService,
  ],
  exports: [
    TenantProvisioningService,
    CompanyBranchStep,
    RolesPermissionsStep,
    ManagingDirectorStep,
    DefaultDepartmentsStep,
    DefaultSettingsStep,
    DefaultNumberingStep,
    DefaultTemplatesStep,
    DemoStaffStep,
    DemoLandStep,
    DemoProjectStep,
    DemoPropertyStep,
    DemoSeedService,
  ],
})
export class TenantProvisioningModule {}
