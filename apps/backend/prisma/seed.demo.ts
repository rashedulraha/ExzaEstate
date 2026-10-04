import path from 'node:path';
import { ConfigService } from '../src/config/config.service.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { SystemPrisma } from '../src/database/system-prisma.service.js';
import { TenantDb } from '../src/database/tenant-db.service.js';
import { RequestContext } from '../src/common/context/request-context.service.js';
import { CompanyBranchStep } from '../src/platform/tenant-provisioning/steps/company-branch.step.js';
import { RolesPermissionsStep } from '../src/platform/tenant-provisioning/steps/roles-permissions.step.js';
import { ManagingDirectorStep } from '../src/platform/tenant-provisioning/steps/managing-director.step.js';
import { DefaultDepartmentsStep } from '../src/platform/tenant-provisioning/steps/default-departments.step.js';
import { DefaultSettingsStep } from '../src/platform/tenant-provisioning/steps/default-settings.step.js';
import { DefaultNumberingStep } from '../src/platform/tenant-provisioning/steps/default-numbering.step.js';
import { DefaultTemplatesStep } from '../src/platform/tenant-provisioning/steps/default-templates.step.js';
import { DefaultApprovalRulesStep } from '../src/platform/tenant-provisioning/steps/default-approval-rules.step.js';
import { DefaultCoaStep } from '../src/platform/tenant-provisioning/steps/default-coa.step.js';
import { DefaultPeriodsStep } from '../src/platform/tenant-provisioning/steps/default-periods.step.js';
import { DefaultPostingRulesStep } from '../src/platform/tenant-provisioning/steps/default-posting-rules.step.js';
import { DefaultBanksStep } from '../src/platform/tenant-provisioning/steps/default-banks.step.js';
import { TenantProvisioningService } from '../src/platform/tenant-provisioning/tenant-provisioning.service.js';
import { DemoStaffStep } from '../src/platform/tenant-provisioning/demo-seed/steps/demo-staff.step.js';
import { DemoLandStep } from '../src/platform/tenant-provisioning/demo-seed/steps/demo-land.step.js';
import { DemoProjectStep } from '../src/platform/tenant-provisioning/demo-seed/steps/demo-project.step.js';
import { DemoPropertyStep } from '../src/platform/tenant-provisioning/demo-seed/steps/demo-property.step.js';
import { DemoCrmStep } from '../src/platform/tenant-provisioning/demo-seed/steps/demo-crm.step.js';
import { DemoCustomerStep } from '../src/platform/tenant-provisioning/demo-seed/steps/demo-customer.step.js';
import { DemoPaymentPlanStep } from '../src/platform/tenant-provisioning/demo-seed/steps/demo-payment-plan.step.js';
import { DemoChargeStep } from '../src/platform/tenant-provisioning/demo-seed/steps/demo-charge.step.js';
import { DemoQuotationStep } from '../src/platform/tenant-provisioning/demo-seed/steps/demo-quotation.step.js';
import { DemoSeedService } from '../src/platform/tenant-provisioning/demo-seed/demo-seed.service.js';
import { FieldCryptoService } from '../src/platform/security/field-crypto.service.js';

// Load environment variables via native Node.js API
if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile(path.resolve(process.cwd(), '.env'));
  } catch {}
  try {
    process.loadEnvFile(path.resolve(process.cwd(), '../../.env'));
  } catch {}
}

async function runDemoSeed() {
  console.log('--- ExzaEstate Database Rich Demo Seed (Bangla Fixtures) ---');

  const configService = new ConfigService();
  const prisma = new PrismaService(configService);
  const systemPrisma = new SystemPrisma(configService);

  await prisma.onModuleInit();
  await systemPrisma.onModuleInit();

  const dummyCls = {
    get: (_key: string) => undefined,
    set: (_key: string, _value: unknown) => {},
  };
  const requestContext = new RequestContext(dummyCls as unknown as import('nestjs-cls').ClsService);
  const tenantDb = new TenantDb(prisma, requestContext);

  const companyBranchStep = new CompanyBranchStep();
  const rolesPermissionsStep = new RolesPermissionsStep();
  const managingDirectorStep = new ManagingDirectorStep();
  const defaultDepartmentsStep = new DefaultDepartmentsStep();
  const defaultSettingsStep = new DefaultSettingsStep();
  const defaultNumberingStep = new DefaultNumberingStep();
  const defaultTemplatesStep = new DefaultTemplatesStep();
  const defaultApprovalRulesStep = new DefaultApprovalRulesStep();
  const defaultCoaStep = new DefaultCoaStep();
  const defaultPeriodsStep = new DefaultPeriodsStep();
  const defaultPostingRulesStep = new DefaultPostingRulesStep();
  const defaultBanksStep = new DefaultBanksStep();

  await defaultBanksStep.seedGlobalBanks(systemPrisma);
  console.log('✓ Global banks and branches reference data seeded');

  const provisioningService = new TenantProvisioningService(
    tenantDb,
    systemPrisma,
    companyBranchStep,
    rolesPermissionsStep,
    managingDirectorStep,
    defaultDepartmentsStep,
    defaultSettingsStep,
    defaultNumberingStep,
    defaultTemplatesStep,
    defaultApprovalRulesStep,
    defaultCoaStep,
    defaultPeriodsStep,
    defaultPostingRulesStep,
  );
  provisioningService.onModuleInit();

  const demoStaffStep = new DemoStaffStep();
  const demoLandStep = new DemoLandStep();
  const demoProjectStep = new DemoProjectStep();
  const demoPropertyStep = new DemoPropertyStep();
  const demoCrmStep = new DemoCrmStep();
  const fieldCrypto = new FieldCryptoService(configService);
  const demoCustomerStep = new DemoCustomerStep(fieldCrypto);
  const demoPaymentPlanStep = new DemoPaymentPlanStep();
  const demoChargeStep = new DemoChargeStep();
  const demoQuotationStep = new DemoQuotationStep();

  const demoSeedService = new DemoSeedService(
    tenantDb,
    provisioningService,
    demoStaffStep,
    demoLandStep,
    demoProjectStep,
    demoPropertyStep,
    demoCrmStep,
    demoCustomerStep,
    demoPaymentPlanStep,
    demoChargeStep,
    demoQuotationStep,
  );
  demoSeedService.onModuleInit();

  try {
    const result = await demoSeedService.runDemoSeed();

    console.log('✓ Demo seed succeeded:');
    console.log(`  Company ID: ${result.companyId}`);
    console.log(`  Company Code: ${result.companyCode}`);
    console.log(`  Branch ID: ${result.branchId}`);
    console.log('  Seeded 4 core role accounts with password: ExzaEstate@2026!');
    console.log('    - MD:         md@exzaestate.com');
    console.log('    - GM:         gm@exzaestate.com');
    console.log('    - Accountant: accountant@exzaestate.com');
    console.log('    - Executive:  executive@exzaestate.com, executive2@exzaestate.com');
  } catch (error) {
    console.error('✗ Demo seed failed:', error);
    process.exit(1);
  } finally {
    await systemPrisma.onModuleDestroy();
    await prisma.onModuleDestroy();
  }
}

runDemoSeed();
