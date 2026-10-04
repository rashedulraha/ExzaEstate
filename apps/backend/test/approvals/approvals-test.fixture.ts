import type { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ClsModule } from 'nestjs-cls';
import crypto from 'node:crypto';
import { AdaptersModule } from '../../src/adapters/adapters.module.js';
import { configureApp } from '../../src/bootstrap.js';
import { ConfigModule } from '../../src/config/config.module.js';
import { ConfigService } from '../../src/config/config.service.js';
import { validateEnv } from '../../src/config/env.schema.js';
import { DatabaseModule } from '../../src/database/database.module.js';
import { TenantDb } from '../../src/database/tenant-db.service.js';
import { AuthModule } from '../../src/modules/auth/auth.module.js';
import { TokenService } from '../../src/modules/auth/token.service.js';
import { ApprovalsModule } from '../../src/modules/approvals/approvals.module.js';
import { SalesModule } from '../../src/modules/sales/sales.module.js';
import { PlatformModule } from '../../src/platform/platform.module.js';
import { TenantProvisioningModule } from '../../src/platform/tenant-provisioning/tenant-provisioning.module.js';
import { TenantProvisioningService } from '../../src/platform/tenant-provisioning/tenant-provisioning.service.js';

export interface ApprovalsTestContext {
  app: INestApplication;
  tenantDb: TenantDb;
  companyAId: string;
  mdUserId: string;
  mdToken: string;
  gmUserId: string;
  gmToken: string;
  execUserId: string;
  execToken: string;
  singleCompanyId: string;
  singleMdUserId: string;
  singleMdToken: string;
  propertyAId: string;
  singlePropertyId: string;
  close: () => Promise<void>;
}

export async function setupApprovalsTestContext(): Promise<ApprovalsTestContext> {
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
    CORS_ORIGIN: 'http://localhost:5173,tauri://localhost',
  });

  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot(config),
      ClsModule.forRoot({ global: true, middleware: { mount: true } }),
      DatabaseModule,
      PlatformModule,
      AdaptersModule.forRoot('cloud'),
      AuthModule,
      ApprovalsModule,
      SalesModule,
      TenantProvisioningModule,
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  const configService = moduleRef.get(ConfigService);
  configureApp(app, configService);
  await app.init();

  const tenantDb = moduleRef.get(TenantDb);
  const tokenService = moduleRef.get(TokenService);
  const provisioningService = moduleRef.get(TenantProvisioningService);

  const suffixA = crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
  const suffixS = crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();

  // 1. Provision Multi-User Company A
  const provA = await provisioningService.provisionCompany({
    name: `Approvals Test Corp ${suffixA}`,
    code: `AP${suffixA}`,
    branchName: 'Head Office',
    branchCode: 'HO-01',
    managingDirector: {
      email: `md_appr_${suffixA.toLowerCase()}@exzaestate.test`,
      fullName: 'Approvals MD',
      password: 'Password123!Secure',
      isLocalMode: true,
    },
  });
  const companyAId = provA.companyId;
  const mdUserId = provA.managingDirectorUserId;

  let gmUserId = '';
  let execUserId = '';

  await tenantDb.withCompany(companyAId, async (tx) => {
    await tx.user.update({
      where: { id: mdUserId },
      data: { isTwoFactorEnabled: true, twoFactorEnrolledAt: new Date(), status: 'ACTIVE' },
    });

    const gmRole = await tx.role.findFirstOrThrow({
      where: { companyId: companyAId, code: 'GENERAL_MANAGER' },
    });
    const execRole = await tx.role.findFirstOrThrow({
      where: { companyId: companyAId, code: 'EXECUTIVE' },
    });

    const gmUser = await tx.user.create({
      data: {
        companyId: companyAId,
        email: `gm_${suffixA.toLowerCase()}@exzaestate.test`,
        fullName: 'Approvals GM',
        passwordHash: 'seeded_dummy_hash',
        status: 'ACTIVE',
        isTwoFactorEnabled: true,
        twoFactorEnrolledAt: new Date(),
      },
    });
    await tx.userRole.create({
      data: { userId: gmUser.id, roleId: gmRole.id, companyId: companyAId },
    });
    gmUserId = gmUser.id;

    const execUser = await tx.user.create({
      data: {
        companyId: companyAId,
        email: `exec_${suffixA.toLowerCase()}@exzaestate.test`,
        fullName: 'Approvals Exec',
        passwordHash: 'seeded_dummy_hash',
        status: 'ACTIVE',
        isTwoFactorEnabled: true,
        twoFactorEnrolledAt: new Date(),
      },
    });
    await tx.userRole.create({
      data: { userId: execUser.id, roleId: execRole.id, companyId: companyAId },
    });
    execUserId = execUser.id;
  });

  const mdSession = await tenantDb.withCompany(companyAId, (tx) =>
    tx.session.create({
      data: { companyId: companyAId, userId: mdUserId, familyId: crypto.randomUUID() },
    }),
  );
  const mdToken = tokenService.generateAccessToken({
    sub: mdUserId,
    companyId: companyAId,
    sid: mdSession.id,
  });

  const gmSession = await tenantDb.withCompany(companyAId, (tx) =>
    tx.session.create({
      data: { companyId: companyAId, userId: gmUserId, familyId: crypto.randomUUID() },
    }),
  );
  const gmToken = tokenService.generateAccessToken({
    sub: gmUserId,
    companyId: companyAId,
    sid: gmSession.id,
  });

  const execSession = await tenantDb.withCompany(companyAId, (tx) =>
    tx.session.create({
      data: { companyId: companyAId, userId: execUserId, familyId: crypto.randomUUID() },
    }),
  );
  const execToken = tokenService.generateAccessToken({
    sub: execUserId,
    companyId: companyAId,
    sid: execSession.id,
  });

  // 2. Provision Single-User Company
  const provS = await provisioningService.provisionCompany({
    name: `Solo Test Corp ${suffixS}`,
    code: `SL${suffixS}`,
    branchName: 'Main',
    branchCode: 'MN-01',
    managingDirector: {
      email: `md_solo_${suffixS.toLowerCase()}@exzaestate.test`,
      fullName: 'Solo MD',
      password: 'Password123!Secure',
      isLocalMode: true,
    },
  });
  const singleCompanyId = provS.companyId;
  const singleMdUserId = provS.managingDirectorUserId;

  await tenantDb.withCompany(singleCompanyId, async (tx) => {
    await tx.user.update({
      where: { id: singleMdUserId },
      data: { isTwoFactorEnabled: true, twoFactorEnrolledAt: new Date(), status: 'ACTIVE' },
    });
  });

  const singleMdSession = await tenantDb.withCompany(singleCompanyId, (tx) =>
    tx.session.create({
      data: { companyId: singleCompanyId, userId: singleMdUserId, familyId: crypto.randomUUID() },
    }),
  );
  const singleMdToken = tokenService.generateAccessToken({
    sub: singleMdUserId,
    companyId: singleCompanyId,
    sid: singleMdSession.id,
  });

  // 3. Seed Properties for Quotation tests
  const propertyAId = await tenantDb.withCompany(companyAId, async (tx) => {
    const land = await tx.land.create({
      data: {
        companyId: companyAId,
        code: `LND-A-${suffixA}`,
        name: 'Land A',
        district: 'Dhaka',
        upazila: 'Gulshan',
        mouza: 'Tejgaon',
        areaSqft: 5000,
        status: 'ACTIVE',
      },
    });
    const proj = await tx.project.create({
      data: {
        companyId: companyAId,
        landId: land.id,
        code: `PRJ-A-${suffixA}`,
        name: 'Project A',
        type: 'RESIDENTIAL',
        status: 'PLANNING',
      },
    });
    const prop = await tx.property.create({
      data: {
        companyId: companyAId,
        projectId: proj.id,
        code: `UNIT-A-${suffixA}`,
        type: 'FLAT',
        status: 'Available',
        areaSqft: 1500,
        basePricePaisa: 10_000_000_0n,
        netPricePaisa: 10_000_000_0n,
      },
    });
    return prop.id;
  });

  const singlePropertyId = await tenantDb.withCompany(singleCompanyId, async (tx) => {
    const land = await tx.land.create({
      data: {
        companyId: singleCompanyId,
        code: `LND-S-${suffixS}`,
        name: 'Land S',
        district: 'Dhaka',
        upazila: 'Gulshan',
        mouza: 'Tejgaon',
        areaSqft: 5000,
        status: 'ACTIVE',
      },
    });
    const proj = await tx.project.create({
      data: {
        companyId: singleCompanyId,
        landId: land.id,
        code: `PRJ-S-${suffixS}`,
        name: 'Project S',
        type: 'RESIDENTIAL',
        status: 'PLANNING',
      },
    });
    const prop = await tx.property.create({
      data: {
        companyId: singleCompanyId,
        projectId: proj.id,
        code: `UNIT-S-${suffixS}`,
        type: 'FLAT',
        status: 'Available',
        areaSqft: 1500,
        basePricePaisa: 10_000_000_0n,
        netPricePaisa: 10_000_000_0n,
      },
    });
    return prop.id;
  });

  return {
    app,
    tenantDb,
    companyAId,
    mdUserId,
    mdToken,
    gmUserId,
    gmToken,
    execUserId,
    execToken,
    singleCompanyId,
    singleMdUserId,
    singleMdToken,
    propertyAId,
    singlePropertyId,
    close: async () => {
      await app.close();
    },
  };
}
