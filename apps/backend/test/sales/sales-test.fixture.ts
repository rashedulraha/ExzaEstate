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
import { SalesModule } from '../../src/modules/sales/sales.module.js';
import { PlatformModule } from '../../src/platform/platform.module.js';
import { TenantProvisioningModule } from '../../src/platform/tenant-provisioning/tenant-provisioning.module.js';
import { TenantProvisioningService } from '../../src/platform/tenant-provisioning/tenant-provisioning.service.js';

export interface SalesTestContext {
  app: INestApplication;
  tenantDb: TenantDb;
  companyAId: string;
  companyBId: string;
  mdUserId: string;
  mdToken: string;
  execUserId: string;
  execToken: string;
  companyBToken: string;
  close: () => Promise<void>;
}

export async function setupSalesTestContext(): Promise<SalesTestContext> {
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

  const uniqueSuffixA = crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
  const uniqueSuffixB = crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();

  // 1. Provision Company A
  const provA = await provisioningService.provisionCompany({
    name: `Sales Test Real Estate ${uniqueSuffixA}`,
    code: `SA${uniqueSuffixA}`,
    branchName: 'Dhanmondi Branch',
    branchCode: 'DHM-01',
    managingDirector: {
      email: `md_sales_${uniqueSuffixA.toLowerCase()}@exzaestate.test`,
      fullName: 'Sales MD User',
      password: 'Password123!Secure',
      isLocalMode: true,
    },
  });
  const companyAId = provA.companyId;
  const mdUserId = provA.managingDirectorUserId;

  // MD 2FA & Session
  await tenantDb.withCompany(companyAId, async (tx) => {
    await tx.user.update({
      where: { id: mdUserId },
      data: { isTwoFactorEnabled: true, twoFactorEnrolledAt: new Date() },
    });
  });

  const mdSession = await tenantDb.withCompany(companyAId, async (tx) => {
    return tx.session.create({
      data: { companyId: companyAId, userId: mdUserId, familyId: crypto.randomUUID() },
    });
  });
  const mdToken = tokenService.generateAccessToken({
    sub: mdUserId,
    companyId: companyAId,
    sid: mdSession.id,
  });

  // 2. Executive User in Company A
  const execRole = await tenantDb.withCompany(companyAId, async (tx) => {
    return tx.role.findFirstOrThrow({
      where: { companyId: companyAId, code: 'EXECUTIVE' },
    });
  });

  const execUser = await tenantDb.withCompany(companyAId, async (tx) => {
    return tx.user.create({
      data: {
        companyId: companyAId,
        email: `exec_sales_${uniqueSuffixA.toLowerCase()}@exzaestate.test`,
        fullName: 'Sales Exec User',
        passwordHash: 'dummy',
        status: 'ACTIVE',
        roles: { create: { companyId: companyAId, roleId: execRole.id } },
      },
    });
  });
  const execUserId = execUser.id;

  const execSession = await tenantDb.withCompany(companyAId, async (tx) => {
    return tx.session.create({
      data: { companyId: companyAId, userId: execUserId, familyId: crypto.randomUUID() },
    });
  });
  const execToken = tokenService.generateAccessToken({
    sub: execUserId,
    companyId: companyAId,
    sid: execSession.id,
  });

  // 3. Provision Company B for multi-tenant isolation testing
  const provB = await provisioningService.provisionCompany({
    name: `Competitor Sales Corp ${uniqueSuffixB}`,
    code: `SB${uniqueSuffixB}`,
    branchName: 'Gulshan Branch',
    branchCode: 'GLS-01',
    managingDirector: {
      email: `md_cpt_${uniqueSuffixB.toLowerCase()}@exzaestate.test`,
      fullName: 'Competitor Sales MD',
      password: 'Password123!Secure',
      isLocalMode: true,
    },
  });
  const companyBId = provB.companyId;
  const companyBUserId = provB.managingDirectorUserId;

  await tenantDb.withCompany(companyBId, async (tx) => {
    await tx.user.update({
      where: { id: companyBUserId },
      data: { isTwoFactorEnabled: true, twoFactorEnrolledAt: new Date() },
    });
  });

  const companyBSession = await tenantDb.withCompany(companyBId, async (tx) => {
    return tx.session.create({
      data: { companyId: companyBId, userId: companyBUserId, familyId: crypto.randomUUID() },
    });
  });
  const companyBToken = tokenService.generateAccessToken({
    sub: companyBUserId,
    companyId: companyBId,
    sid: companyBSession.id,
  });

  return {
    app,
    tenantDb,
    companyAId,
    companyBId,
    mdUserId,
    mdToken,
    execUserId,
    execToken,
    companyBToken,
    close: async () => {
      await app.close();
    },
  };
}
