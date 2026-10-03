import type { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ClsModule } from 'nestjs-cls';
import { AdaptersModule } from '../../src/adapters/adapters.module.js';
import { configureApp } from '../../src/bootstrap.js';
import { ConfigModule } from '../../src/config/config.module.js';
import { ConfigService } from '../../src/config/config.service.js';
import { validateEnv } from '../../src/config/env.schema.js';
import { DatabaseModule } from '../../src/database/database.module.js';
import { TenantDb } from '../../src/database/tenant-db.service.js';
import { AuthModule } from '../../src/modules/auth/auth.module.js';
import { TokenService } from '../../src/modules/auth/token.service.js';
import { LandModule } from '../../src/modules/land/land.module.js';
import { ProjectModule } from '../../src/modules/project/project.module.js';
import { PlatformModule } from '../../src/platform/platform.module.js';
import { TenantProvisioningModule } from '../../src/platform/tenant-provisioning/tenant-provisioning.module.js';
import { TenantProvisioningService } from '../../src/platform/tenant-provisioning/tenant-provisioning.service.js';

export interface ProjectTestContext {
  app: INestApplication;
  tenantDb: TenantDb;
  tokenService: TokenService;
  companyAId: string;
  companyBId: string;
  mdAToken: string;
  mdBToken: string;
  regularUserToken: string;
  landAId: string;
}

export async function setupProjectTest(): Promise<ProjectTestContext> {
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
      AdaptersModule,
      AuthModule,
      LandModule,
      ProjectModule,
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

  const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 8);

  // Provision Company A
  const provA = await provisioningService.provisionCompany({
    name: 'Project Test Estate A',
    code: `PRJA${suffix}`,
    branchName: 'Head Office A',
    branchCode: 'HO-A',
    managingDirector: {
      email: `mda_prj_${suffix}@exzaestate.test`,
      fullName: 'MD Company A',
      password: 'Password123!Secure',
      isLocalMode: true,
    },
  });
  const companyAId = provA.companyId;

  const sessionA = await tenantDb.withCompany(companyAId, async (tx) => {
    await tx.user.update({
      where: { id: provA.managingDirectorUserId },
      data: { status: 'ACTIVE', isTwoFactorEnabled: true },
    });
    return tx.session.create({
      data: {
        companyId: companyAId,
        userId: provA.managingDirectorUserId,
        familyId: crypto.randomUUID(),
      },
    });
  });
  const mdAToken = tokenService.generateAccessToken({
    sub: provA.managingDirectorUserId,
    companyId: companyAId,
    sid: sessionA.id,
  });

  // Provision Company B (for isolation)
  const provB = await provisioningService.provisionCompany({
    name: 'Project Test Estate B',
    code: `PRJB${suffix}`,
    branchName: 'Head Office B',
    branchCode: 'HO-B',
    managingDirector: {
      email: `mdb_prj_${suffix}@exzaestate.test`,
      fullName: 'MD Company B',
      password: 'Password123!Secure',
      isLocalMode: true,
    },
  });
  const companyBId = provB.companyId;

  const sessionB = await tenantDb.withCompany(companyBId, async (tx) => {
    await tx.user.update({
      where: { id: provB.managingDirectorUserId },
      data: { status: 'ACTIVE', isTwoFactorEnabled: true },
    });
    return tx.session.create({
      data: {
        companyId: companyBId,
        userId: provB.managingDirectorUserId,
        familyId: crypto.randomUUID(),
      },
    });
  });
  const mdBToken = tokenService.generateAccessToken({
    sub: provB.managingDirectorUserId,
    companyId: companyBId,
    sid: sessionB.id,
  });

  // Create user in Company A with NO project permissions
  const regularUser = await tenantDb.withCompany(companyAId, async (tx) => {
    return tx.user.create({
      data: {
        companyId: companyAId,
        email: `reg_prj_${suffix}@exzaestate.test`,
        fullName: 'Regular Viewer',
        passwordHash: 'dummy',
        status: 'ACTIVE',
      },
    });
  });
  const regularSession = await tenantDb.withCompany(companyAId, async (tx) => {
    return tx.session.create({
      data: { companyId: companyAId, userId: regularUser.id, familyId: crypto.randomUUID() },
    });
  });
  const regularUserToken = tokenService.generateAccessToken({
    sub: regularUser.id,
    companyId: companyAId,
    sid: regularSession.id,
  });

  // Seed a land parcel for Company A
  const landA = await tenantDb.withCompany(companyAId, async (tx) => {
    return tx.land.create({
      data: {
        companyId: companyAId,
        name: 'Bashundhara Land Master',
        code: `LND-TEST-${suffix}`,
        district: 'Dhaka',
        upazila: 'Keraniganj',
        mouza: 'Hasnabad',
        areaSqft: 14400.0,
      },
    });
  });

  return {
    app,
    tenantDb,
    tokenService,
    companyAId,
    companyBId,
    mdAToken,
    mdBToken,
    regularUserToken,
    landAId: landA.id,
  };
}
