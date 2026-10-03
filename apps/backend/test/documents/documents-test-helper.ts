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
import { DocumentsModule } from '../../src/modules/documents/documents.module.js';
import { PlatformModule } from '../../src/platform/platform.module.js';
import { StorageService } from '../../src/platform/storage/storage.service.js';
import { TenantProvisioningModule } from '../../src/platform/tenant-provisioning/tenant-provisioning.module.js';
import { TenantProvisioningService } from '../../src/platform/tenant-provisioning/tenant-provisioning.service.js';

export interface DocumentTestContext {
  app: INestApplication;
  tenantDb: TenantDb;
  storageService: StorageService;
  companyAId: string;
  companyBId: string;
  mdAToken: string;
  mdBToken: string;
  executiveToken: string;
}

export async function createDocumentTestContext(): Promise<DocumentTestContext> {
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
    STORAGE_ENDPOINT: process.env.STORAGE_ENDPOINT || 'http://localhost:9000',
    STORAGE_BUCKET: process.env.STORAGE_BUCKET || 'exzaestate-documents',
    STORAGE_ACCESS_KEY: process.env.STORAGE_ACCESS_KEY || 'minioadmin',
    STORAGE_SECRET_KEY: process.env.STORAGE_SECRET_KEY || 'minioadmin',
    STORAGE_FORCE_PATH_STYLE: 'true',
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
      DocumentsModule,
      TenantProvisioningModule,
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  const configService = moduleRef.get<ConfigService>(ConfigService);
  configureApp(app, configService);
  await app.init();

  const tenantDb = moduleRef.get<TenantDb>(TenantDb);
  const tokenService = moduleRef.get<TokenService>(TokenService);
  const provisioningService = moduleRef.get<TenantProvisioningService>(TenantProvisioningService);
  const storageService = moduleRef.get<StorageService>(StorageService);

  await storageService.ensureBucketExists();

  const compA = await provisioningService.provisionCompany({
    name: 'Document Test Company A',
    code: `DOC${Date.now().toString().slice(-4)}A`,
    branchName: 'Head Office A',
    branchCode: 'HO-A',
    managingDirector: {
      email: `mda_${Date.now()}@exzaestate.test`,
      fullName: 'MD Doc User A',
      password: 'Password123!Secure',
      isLocalMode: true,
    },
  });

  const compB = await provisioningService.provisionCompany({
    name: 'Document Test Company B',
    code: `DOC${Date.now().toString().slice(-4)}B`,
    branchName: 'Head Office B',
    branchCode: 'HO-B',
    managingDirector: {
      email: `mdb_${Date.now()}@exzaestate.test`,
      fullName: 'MD Doc User B',
      password: 'Password123!Secure',
      isLocalMode: true,
    },
  });

  const sessionA = await tenantDb.withCompany(compA.companyId, async (tx) => {
    await tx.user.update({
      where: { id: compA.managingDirectorUserId },
      data: { status: 'ACTIVE', isTwoFactorEnabled: true },
    });
    return tx.session.create({
      data: {
        companyId: compA.companyId,
        userId: compA.managingDirectorUserId,
        familyId: crypto.randomUUID(),
      },
    });
  });

  const sessionB = await tenantDb.withCompany(compB.companyId, async (tx) => {
    await tx.user.update({
      where: { id: compB.managingDirectorUserId },
      data: { status: 'ACTIVE', isTwoFactorEnabled: true },
    });
    return tx.session.create({
      data: {
        companyId: compB.companyId,
        userId: compB.managingDirectorUserId,
        familyId: crypto.randomUUID(),
      },
    });
  });

  const mdAToken = tokenService.generateAccessToken({
    sub: compA.managingDirectorUserId,
    companyId: compA.companyId,
    sid: sessionA.id,
  });

  const mdBToken = tokenService.generateAccessToken({
    sub: compB.managingDirectorUserId,
    companyId: compB.companyId,
    sid: sessionB.id,
  });

  const execSession = await tenantDb.withCompany(compA.companyId, async (tx) => {
    const execRole = await tx.role.findFirstOrThrow({
      where: { companyId: compA.companyId, name: 'Executive' },
    });
    const execUser = await tx.user.create({
      data: {
        companyId: compA.companyId,
        email: `exec-doc-${Date.now()}@example.com`,
        passwordHash: 'dummy-hash',
        fullName: 'Executive User',
        phone: `+8801700${Math.floor(100000 + Math.random() * 900000)}`,
        status: 'ACTIVE',
      },
    });
    await tx.userRole.create({
      data: {
        companyId: compA.companyId,
        userId: execUser.id,
        roleId: execRole.id,
      },
    });
    return tx.session.create({
      data: {
        companyId: compA.companyId,
        userId: execUser.id,
        familyId: crypto.randomUUID(),
      },
    });
  });

  const executiveToken = tokenService.generateAccessToken({
    sub: execSession.userId,
    companyId: compA.companyId,
    sid: execSession.id,
  });

  return {
    app,
    tenantDb,
    storageService,
    companyAId: compA.companyId,
    companyBId: compB.companyId,
    mdAToken,
    mdBToken,
    executiveToken,
  };
}
