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
import { AccountingModule } from '../../src/modules/accounting/accounting.module.js';
import { ReportsModule } from '../../src/modules/reports/reports.module.js';
import { PlatformModule } from '../../src/platform/platform.module.js';
import { TenantProvisioningModule } from '../../src/platform/tenant-provisioning/tenant-provisioning.module.js';
import { TenantProvisioningService } from '../../src/platform/tenant-provisioning/tenant-provisioning.service.js';

export interface AccountingTestContext {
  app: INestApplication;
  tenantDb: TenantDb;
  provisioningService: TenantProvisioningService;
  companyAId: string;
  companyBId: string;
  mdUserId: string;
  mdToken: string;
  accountantUserId: string;
  accountantToken: string;
  executiveToken: string;
  companyBToken: string;
  close: () => Promise<void>;
}

export async function setupAccountingTestContext(): Promise<AccountingTestContext> {
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
      AccountingModule,
      ReportsModule,
      TenantProvisioningModule,
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  const configService = app.get(ConfigService);
  configureApp(app, configService);
  await app.init();

  const tenantDb = app.get(TenantDb);
  const provisioningService = app.get(TenantProvisioningService);
  const tokenService = app.get(TokenService);

  const suffixA = crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
  const suffixB = crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();

  const provA = await provisioningService.provisionCompany({
    name: `Accounting Test Co A ${suffixA}`,
    code: `ACTA${suffixA}`,
    branchName: 'Head Office',
    branchCode: 'HO-01',
    managingDirector: {
      email: `md_act_${suffixA.toLowerCase()}@exzaestate.test`,
      fullName: 'Accounting MD User',
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

  // Accountant User in Company A (has period:view, period:close, but NOT period:reopen)
  const accUser = await tenantDb.withCompany(companyAId, async (tx) => {
    const role = await tx.role.findFirstOrThrow({
      where: { companyId: companyAId, code: 'ACCOUNTANT' },
    });
    return tx.user.create({
      data: {
        companyId: companyAId,
        email: `acc_act_${suffixA.toLowerCase()}@exzaestate.test`,
        fullName: 'Accounting User',
        passwordHash: 'dummy',
        status: 'ACTIVE',
        isTwoFactorEnabled: true,
        twoFactorEnrolledAt: new Date(),
        roles: {
          create: {
            companyId: companyAId,
            roleId: role.id,
          },
        },
      },
    });
  });
  const accountantUserId = accUser.id;
  const accSession = await tenantDb.withCompany(companyAId, async (tx) => {
    return tx.session.create({
      data: { companyId: companyAId, userId: accountantUserId, familyId: crypto.randomUUID() },
    });
  });
  const accountantToken = tokenService.generateAccessToken({
    sub: accountantUserId,
    companyId: companyAId,
    sid: accSession.id,
  });

  // Executive User in Company A (does not have ledger:view)
  const execUser = await tenantDb.withCompany(companyAId, async (tx) => {
    const role = await tx.role.findFirstOrThrow({
      where: { companyId: companyAId, code: 'EXECUTIVE' },
    });
    return tx.user.create({
      data: {
        companyId: companyAId,
        email: `exec_act_${suffixA.toLowerCase()}@exzaestate.test`,
        fullName: 'Executive User',
        passwordHash: 'dummy',
        status: 'ACTIVE',
        isTwoFactorEnabled: false,
        roles: {
          create: {
            companyId: companyAId,
            roleId: role.id,
          },
        },
      },
    });
  });
  const executiveUserId = execUser.id;
  const execSession = await tenantDb.withCompany(companyAId, async (tx) => {
    return tx.session.create({
      data: { companyId: companyAId, userId: executiveUserId, familyId: crypto.randomUUID() },
    });
  });
  const executiveToken = tokenService.generateAccessToken({
    sub: executiveUserId,
    companyId: companyAId,
    sid: execSession.id,
  });

  const provB = await provisioningService.provisionCompany({
    name: `Accounting Test Co B ${suffixB}`,
    code: `ACTB${suffixB}`,
    branchName: 'Branch B',
    branchCode: 'BB-01',
    managingDirector: {
      email: `md_actb_${suffixB.toLowerCase()}@exzaestate.test`,
      fullName: 'Competitor MD User',
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
    provisioningService,
    companyAId,
    companyBId,
    mdUserId,
    mdToken,
    accountantUserId,
    accountantToken,
    executiveToken,
    companyBToken,
    close: async () => {
      await app.close();
    },
  };
}
