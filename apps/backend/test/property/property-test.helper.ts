import { Test, TestingModule } from '@nestjs/testing';
import { ClsModule } from 'nestjs-cls';
import { RequestContext } from '../../src/common/context/request-context.service.js';
import { ConfigModule } from '../../src/config/config.module.js';
import { validateEnv } from '../../src/config/env.schema.js';
import { DatabaseModule } from '../../src/database/database.module.js';
import { PrismaService } from '../../src/database/prisma.service.js';
import { SystemPrisma } from '../../src/database/system-prisma.service.js';
import { TenantDb } from '../../src/database/tenant-db.service.js';
import { AuditService } from '../../src/platform/audit/audit.service.js';

export interface PropertyTestContext {
  moduleRef: TestingModule;
  tenantDb: TenantDb;
  prismaService: PrismaService;
  systemPrisma: SystemPrisma;
  auditService: AuditService;
  companyAId: string;
  companyBId: string;
  testUserId: string;
  projectAId: string;
  cleanup: () => Promise<void>;
}

export async function setupPropertyTestContext(): Promise<PropertyTestContext> {
  const companyAId = '40000000-0000-0000-0000-000000000001';
  const companyBId = '40000000-0000-0000-0000-000000000002';
  const testUserId = '10000000-0000-0000-0000-000000000001';
  let projectAId = '';

  const config = validateEnv({
    NODE_ENV: 'test',
    PORT: '3000',
    RUNTIME_MODE: 'cloud',
    DATABASE_URL:
      process.env.DATABASE_URL ||
      'postgresql://exza_app:exza_app_secret@localhost:5432/exzaestate?schema=public',
    MIGRATOR_DATABASE_URL:
      process.env.MIGRATOR_DATABASE_URL ||
      'postgresql://exza_migrator:exza_migrator_secret@localhost:5432/exzaestate?schema=public',
    REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
    JWT_ACCESS_SECRET: 'super_secret_jwt_access_token_key_at_least_32_chars',
    JWT_REFRESH_SECRET: 'super_secret_jwt_refresh_token_key_at_least_32_chars',
    STORAGE_ENDPOINT: 'http://localhost:9000',
    STORAGE_BUCKET: 'exzaestate-documents',
    STORAGE_ACCESS_KEY: 'minioadmin',
    STORAGE_SECRET_KEY: 'minioadmin',
  });

  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot(config),
      ClsModule.forRoot({
        global: true,
        middleware: { mount: false },
      }),
      DatabaseModule,
    ],
    providers: [RequestContext, TenantDb],
  }).compile();

  const tenantDb = moduleRef.get<TenantDb>(TenantDb);
  const prismaService = moduleRef.get<PrismaService>(PrismaService);
  const systemPrisma = moduleRef.get<SystemPrisma>(SystemPrisma);
  await prismaService.onModuleInit();
  await systemPrisma.onModuleInit();

  // Setup base project for Company A
  await tenantDb.withCompany(companyAId, async (tx) => {
    const existingProject = await tx.project.findFirst({
      where: { companyId: companyAId, code: 'PRJ-TEST-001' },
    });

    if (existingProject) {
      projectAId = existingProject.id;
    } else {
      const project = await tx.project.create({
        data: {
          companyId: companyAId,
          code: 'PRJ-TEST-001',
          name: 'Test Project Property Hierarchy',
          type: 'RESIDENTIAL',
          status: 'PLANNING',
          createdById: testUserId,
        },
      });
      projectAId = project.id;
    }
  });

  const requestContext = moduleRef.get<RequestContext>(RequestContext);
  const auditService = new AuditService(requestContext);

  const cleanup = async () => {
    if (prismaService) {
      await prismaService.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_company_id', ${companyAId}, true)`;
        await tx
          .$executeRawUnsafe(
            `DELETE FROM property_status_history WHERE company_id = '${companyAId}'`,
          )
          .catch(() => {});
        await tx
          .$executeRawUnsafe(`DELETE FROM properties WHERE company_id = '${companyAId}'`)
          .catch(() => {});
        await tx
          .$executeRawUnsafe(`DELETE FROM property_floors WHERE company_id = '${companyAId}'`)
          .catch(() => {});
        await tx
          .$executeRawUnsafe(`DELETE FROM property_blocks WHERE company_id = '${companyAId}'`)
          .catch(() => {});
      });
      await prismaService.onModuleDestroy();
    }
    if (systemPrisma) {
      await systemPrisma.onModuleDestroy();
    }
    await moduleRef.close();
  };

  return {
    moduleRef,
    tenantDb,
    prismaService,
    systemPrisma,
    auditService,
    companyAId,
    companyBId,
    testUserId,
    projectAId,
    cleanup,
  };
}

export async function seedPropertyTestHierarchy(ctx: PropertyTestContext) {
  return ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
    const block = await tx.propertyBlock.create({
      data: {
        companyId: ctx.companyAId,
        projectId: ctx.projectAId,
        code: `BLK-${Date.now()}`,
        name: 'Block Alpha',
        type: 'BLOCK',
        createdById: ctx.testUserId,
      },
    });

    const floor = await tx.propertyFloor.create({
      data: {
        companyId: ctx.companyAId,
        projectId: ctx.projectAId,
        blockId: block.id,
        code: `FL-${Date.now()}`,
        name: 'Floor 1',
        floorNumber: 1,
        type: 'FLOOR',
        createdById: ctx.testUserId,
      },
    });

    return { blockId: block.id, floorId: floor.id };
  });
}
