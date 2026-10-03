import path from 'node:path';
import { ConfigService } from '../src/config/config.service.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { SystemPrisma } from '../src/database/system-prisma.service.js';
import { TenantDb } from '../src/database/tenant-db.service.js';
import { RequestContext } from '../src/common/context/request-context.service.js';
import { CompanyBranchStep } from '../src/platform/tenant-provisioning/steps/company-branch.step.js';
import { RolesPermissionsStep } from '../src/platform/tenant-provisioning/steps/roles-permissions.step.js';
import { ManagingDirectorStep } from '../src/platform/tenant-provisioning/steps/managing-director.step.js';
import { TenantProvisioningService } from '../src/platform/tenant-provisioning/tenant-provisioning.service.js';
import { DemoStaffStep } from '../src/platform/tenant-provisioning/demo-seed/steps/demo-staff.step.js';
import { DemoSeedService } from '../src/platform/tenant-provisioning/demo-seed/demo-seed.service.js';

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

  const provisioningService = new TenantProvisioningService(
    tenantDb,
    systemPrisma,
    companyBranchStep,
    rolesPermissionsStep,
    managingDirectorStep,
  );
  provisioningService.onModuleInit();

  const demoStaffStep = new DemoStaffStep();
  const demoSeedService = new DemoSeedService(tenantDb, provisioningService, demoStaffStep);
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
