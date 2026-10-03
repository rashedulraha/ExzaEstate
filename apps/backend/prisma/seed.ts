import path from 'node:path';
import { ConfigService } from '../src/config/config.service.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { SystemPrisma } from '../src/database/system-prisma.service.js';
import { TenantDb } from '../src/database/tenant-db.service.js';
import { RequestContext } from '../src/common/context/request-context.service.js';
import { CompanyBranchStep } from '../src/platform/tenant-provisioning/steps/company-branch.step.js';
import { RolesPermissionsStep } from '../src/platform/tenant-provisioning/steps/roles-permissions.step.js';
import { ManagingDirectorStep } from '../src/platform/tenant-provisioning/steps/managing-director.step.js';
import {
  ProvisionCompanyDto,
  TenantProvisioningService,
} from '../src/platform/tenant-provisioning/tenant-provisioning.service.js';

// Load environment variables via native Node.js API
if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile(path.resolve(process.cwd(), '.env'));
  } catch {}
  try {
    process.loadEnvFile(path.resolve(process.cwd(), '../../.env'));
  } catch {}
}

async function runSeed() {
  console.log('--- ExzaEstate Database Baseline Seed ---');

  const configService = new ConfigService();
  const prisma = new PrismaService(configService);
  const systemPrisma = new SystemPrisma(configService);

  await prisma.onModuleInit();
  await systemPrisma.onModuleInit();

  // Standalone RequestContext for seeding (unbound from HTTP)
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

  try {
    const isLocal =
      process.env.RUNTIME_MODE === 'local' ||
      process.env.SEED_LOCAL_CREDENTIALS === 'true' ||
      process.env.NODE_ENV !== 'production';

    const baselineDto: ProvisionCompanyDto = {
      name: 'ExzaEstate Development Ltd.',
      code: 'EXZA',
      timezone: 'Asia/Dhaka',
      branchName: 'Head Office',
      branchCode: 'HO',
      managingDirector: {
        email: 'md@exzaestate.com',
        fullName: 'Anwar Hossain',
        phone: '+8801700000001',
        password: isLocal ? 'ExzaEstate@2026!' : undefined,
        isLocalMode: isLocal,
      },
    };

    console.log(`Provisioning baseline company: ${baselineDto.name} (${baselineDto.code})`);
    const result = await provisioningService.provisionCompany(baselineDto);

    console.log('✓ Baseline company provisioned successfully:');
    console.log(`  Company ID: ${result.companyId}`);
    console.log(`  Branch ID: ${result.branchId}`);
    console.log(`  Managing Director ID: ${result.managingDirectorUserId}`);
    if (result.invitationToken) {
      console.log(`  Invitation Token: ${result.invitationToken}`);
    } else {
      console.log(`  Local Credentials Active: md@exzaestate.com / ExzaEstate@2026!`);
    }
  } catch (error) {
    console.error('✗ Baseline seed failed:', error);
    process.exit(1);
  } finally {
    await systemPrisma.onModuleDestroy();
    await prisma.onModuleDestroy();
  }
}

runSeed();
