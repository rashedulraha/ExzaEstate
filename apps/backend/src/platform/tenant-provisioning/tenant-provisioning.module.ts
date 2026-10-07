import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { CompanyBranchStep } from './steps/company-branch.step.js';
import { RolesPermissionsStep } from './steps/roles-permissions.step.js';
import { ManagingDirectorStep } from './steps/managing-director.step.js';
import { DefaultDepartmentsStep } from './steps/default-departments.step.js';
import { DefaultSettingsStep } from './steps/default-settings.step.js';
import { DefaultNumberingStep } from './steps/default-numbering.step.js';
import { DefaultTemplatesStep } from './steps/default-templates.step.js';
import { DefaultApprovalRulesStep } from './steps/default-approval-rules.step.js';
import { DefaultCoaStep } from './steps/default-coa.step.js';
import { DefaultPeriodsStep } from './steps/default-periods.step.js';
import { DefaultPostingRulesStep } from './steps/default-posting-rules.step.js';
import { DefaultBanksStep } from './steps/default-banks.step.js';
import { DefaultExpenseCategoriesStep } from './steps/default-expense-categories.step.js';
import { TenantProvisioningService } from './tenant-provisioning.service.js';
import { DemoStaffStep } from './demo-seed/steps/demo-staff.step.js';
import { DemoLandStep } from './demo-seed/steps/demo-land.step.js';
import { DemoProjectStep } from './demo-seed/steps/demo-project.step.js';
import { DemoPropertyStep } from './demo-seed/steps/demo-property.step.js';
import { DemoCrmStep } from './demo-seed/steps/demo-crm.step.js';
import { DemoCustomerStep } from './demo-seed/steps/demo-customer.step.js';
import { DemoPaymentPlanStep } from './demo-seed/steps/demo-payment-plan.step.js';
import { DemoChargeStep } from './demo-seed/steps/demo-charge.step.js';
import { DemoQuotationStep } from './demo-seed/steps/demo-quotation.step.js';
import { DemoApprovalStep } from './demo-seed/steps/demo-approval.step.js';
import { DemoExpenseStep } from './demo-seed/steps/demo-expense.step.js';
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
    DefaultApprovalRulesStep,
    DefaultCoaStep,
    DefaultPeriodsStep,
    DefaultPostingRulesStep,
    DefaultBanksStep,
    DefaultExpenseCategoriesStep,
    TenantProvisioningService,
    DemoStaffStep,
    DemoLandStep,
    DemoProjectStep,
    DemoPropertyStep,
    DemoCrmStep,
    DemoCustomerStep,
    DemoPaymentPlanStep,
    DemoChargeStep,
    DemoQuotationStep,
    DemoApprovalStep,
    DemoExpenseStep,
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
    DefaultApprovalRulesStep,
    DefaultCoaStep,
    DefaultPeriodsStep,
    DefaultPostingRulesStep,
    DefaultBanksStep,
    DefaultExpenseCategoriesStep,
    DemoStaffStep,
    DemoLandStep,
    DemoProjectStep,
    DemoPropertyStep,
    DemoCrmStep,
    DemoCustomerStep,
    DemoPaymentPlanStep,
    DemoChargeStep,
    DemoQuotationStep,
    DemoApprovalStep,
    DemoExpenseStep,
    DemoSeedService,
  ],
})
export class TenantProvisioningModule {}
