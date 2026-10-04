import type { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ClsModule } from 'nestjs-cls';
import crypto from 'node:crypto';
import { DATA_SCOPES, PERMISSIONS } from '@exzaestate/shared';
import { AdaptersModule } from '../../src/adapters/adapters.module.js';
import { configureApp } from '../../src/bootstrap.js';
import { ConfigModule } from '../../src/config/config.module.js';
import { ConfigService } from '../../src/config/config.service.js';
import { validateEnv } from '../../src/config/env.schema.js';
import { DatabaseModule } from '../../src/database/database.module.js';
import { TenantDb } from '../../src/database/tenant-db.service.js';
import { AuthModule } from '../../src/modules/auth/auth.module.js';
import { TokenService } from '../../src/modules/auth/token.service.js';
import { CrmModule } from '../../src/modules/crm/crm.module.js';
import { PlatformModule } from '../../src/platform/platform.module.js';
import { TenantProvisioningModule } from '../../src/platform/tenant-provisioning/tenant-provisioning.module.js';
import { TenantProvisioningService } from '../../src/platform/tenant-provisioning/tenant-provisioning.service.js';

export interface CrmTestContext {
  app: INestApplication;
  tenantDb: TenantDb;
  companyAId: string;
  companyBId: string;
  exec1UserId: string;
  exec1Token: string;
  exec2UserId: string;
  exec2Token: string;
  gmUserId: string;
  gmToken: string;
  companyBToken: string;
  close: () => Promise<void>;
}

export async function setupCrmTestContext(): Promise<CrmTestContext> {
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
      CrmModule,
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
    name: `CRM Test Real Estate Ltd ${uniqueSuffixA}`,
    code: `CA${uniqueSuffixA}`,
    branchName: 'Dhanmondi Branch',
    branchCode: 'DHM-01',
    managingDirector: {
      email: `md_crm_${uniqueSuffixA.toLowerCase()}@exzaestate.test`,
      fullName: 'Anisul Huq (MD)',
      password: 'Password123!Secure',
      isLocalMode: true,
    },
  });
  const companyAId = provA.companyId;

  // 2. Provision Company B for multi-tenant isolation testing
  const provB = await provisioningService.provisionCompany({
    name: `Competitor Builders Ltd ${uniqueSuffixB}`,
    code: `CB${uniqueSuffixB}`,
    branchName: 'Gulshan Branch',
    branchCode: 'GLS-01',
    managingDirector: {
      email: `md_cpt_${uniqueSuffixB.toLowerCase()}@exzaestate.test`,
      fullName: 'Competitor MD',
      password: 'Password123!Secure',
      isLocalMode: true,
    },
  });
  const companyBId = provB.companyId;
  const companyBUserId = provB.managingDirectorUserId;

  // Enable 2FA for Company B MD
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

  // 3. Create Custom Role with OWN scope for Executive testing
  const execOwnRole = await tenantDb.withCompany(companyAId, async (tx) => {
    const role = await tx.role.create({
      data: {
        companyId: companyAId,
        code: 'EXECUTIVE_OWN',
        name: 'Executive (Own Scope)',
        description: 'Sales Executive restricted to OWN data scope',
        isSystem: false,
      },
    });

    const perms = [
      { code: PERMISSIONS.LEAD_VIEW, scope: DATA_SCOPES.OWN },
      { code: PERMISSIONS.LEAD_CREATE },
      { code: PERMISSIONS.LEAD_EDIT },
      { code: PERMISSIONS.FOLLOW_UP_VIEW, scope: DATA_SCOPES.OWN },
      { code: PERMISSIONS.FOLLOW_UP_CREATE },
      { code: PERMISSIONS.FOLLOW_UP_EDIT },
      { code: PERMISSIONS.CUSTOMER_VIEW, scope: DATA_SCOPES.OWN },
      { code: PERMISSIONS.CUSTOMER_CREATE },
      { code: PERMISSIONS.CUSTOMER_EDIT },
      { code: PERMISSIONS.CUSTOMER_DELETE },
    ];

    await tx.rolePermission.createMany({
      data: perms.map((p) => ({
        companyId: companyAId,
        roleId: role.id,
        permissionCode: p.code,
        scope: p.scope,
      })),
    });

    return role;
  });

  // 4. Create Exec 1 & Exec 2 users with EXECUTIVE_OWN role
  const exec1 = await tenantDb.withCompany(companyAId, async (tx) => {
    return tx.user.create({
      data: {
        companyId: companyAId,
        email: `exec1_${uniqueSuffixA.toLowerCase()}@exzaestate.test`,
        fullName: 'Tanveer Ahmed (Exec 1)',
        passwordHash: 'dummy',
        status: 'ACTIVE',
        roles: {
          create: {
            companyId: companyAId,
            roleId: execOwnRole.id,
          },
        },
      },
    });
  });
  const exec1UserId = exec1.id;

  const exec1Session = await tenantDb.withCompany(companyAId, async (tx) => {
    return tx.session.create({
      data: { companyId: companyAId, userId: exec1UserId, familyId: crypto.randomUUID() },
    });
  });
  const exec1Token = tokenService.generateAccessToken({
    sub: exec1UserId,
    companyId: companyAId,
    sid: exec1Session.id,
  });

  const exec2 = await tenantDb.withCompany(companyAId, async (tx) => {
    return tx.user.create({
      data: {
        companyId: companyAId,
        email: `exec2_${uniqueSuffixA.toLowerCase()}@exzaestate.test`,
        fullName: 'Nusrat Jahan (Exec 2)',
        passwordHash: 'dummy',
        status: 'ACTIVE',
        roles: {
          create: {
            companyId: companyAId,
            roleId: execOwnRole.id,
          },
        },
      },
    });
  });
  const exec2UserId = exec2.id;

  const exec2Session = await tenantDb.withCompany(companyAId, async (tx) => {
    return tx.session.create({
      data: { companyId: companyAId, userId: exec2UserId, familyId: crypto.randomUUID() },
    });
  });
  const exec2Token = tokenService.generateAccessToken({
    sub: exec2UserId,
    companyId: companyAId,
    sid: exec2Session.id,
  });

  // 5. Create GM user with GENERAL_MANAGER role (has LEAD_VIEW [ALL])
  const gmRole = await tenantDb.withCompany(companyAId, async (tx) => {
    return tx.role.findUniqueOrThrow({
      where: {
        companyId_code: {
          companyId: companyAId,
          code: 'GENERAL_MANAGER',
        },
      },
    });
  });

  const gm = await tenantDb.withCompany(companyAId, async (tx) => {
    return tx.user.create({
      data: {
        companyId: companyAId,
        email: `gm_${uniqueSuffixA.toLowerCase()}@exzaestate.test`,
        fullName: 'Rafiqul Islam (GM)',
        passwordHash: 'dummy',
        status: 'ACTIVE',
        isTwoFactorEnabled: true,
        twoFactorEnrolledAt: new Date(),
        roles: { create: { companyId: companyAId, roleId: gmRole.id } },
      },
    });
  });
  const gmUserId = gm.id;

  const gmSession = await tenantDb.withCompany(companyAId, async (tx) => {
    return tx.session.create({
      data: { companyId: companyAId, userId: gmUserId, familyId: crypto.randomUUID() },
    });
  });
  const gmToken = tokenService.generateAccessToken({
    sub: gmUserId,
    companyId: companyAId,
    sid: gmSession.id,
  });

  return {
    app,
    tenantDb,
    companyAId,
    companyBId,
    exec1UserId,
    exec1Token,
    exec2UserId,
    exec2Token,
    gmUserId,
    gmToken,
    companyBToken,
    close: async () => {
      await app.close();
    },
  };
}
