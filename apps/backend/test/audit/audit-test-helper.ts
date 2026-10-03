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
import { AuditModule } from '../../src/modules/audit/audit.module.js';
import { AuthModule } from '../../src/modules/auth/auth.module.js';
import { TokenService } from '../../src/modules/auth/token.service.js';
import { AuditService } from '../../src/platform/audit/audit.service.js';
import { PlatformModule } from '../../src/platform/platform.module.js';
import { SecurityEventsService } from '../../src/platform/security/security-events.service.js';
import { TenantProvisioningModule } from '../../src/platform/tenant-provisioning/tenant-provisioning.module.js';
import { TenantProvisioningService } from '../../src/platform/tenant-provisioning/tenant-provisioning.service.js';

export interface AuditTestContext {
  app: INestApplication;
  tenantDb: TenantDb;
  auditService: AuditService;
  securityEventsService: SecurityEventsService;
  companyAId: string;
  companyBId: string;
  mdAToken: string;
  mdBToken: string;
  executiveToken: string;
  no2faToken: string;
  mdAUserId: string;
}

export async function createAuditTestContext(): Promise<AuditTestContext> {
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
      AuditModule,
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
  const auditService = moduleRef.get<AuditService>(AuditService);
  const securityEventsService = moduleRef.get<SecurityEventsService>(SecurityEventsService);

  const compA = await provisioningService.provisionCompany({
    name: 'Audit Test Company A',
    code: `AUD${Date.now().toString().slice(-4)}A`,
    branchName: 'Head Office A',
    branchCode: 'HO-A',
    managingDirector: {
      email: `mda_audit_${Date.now()}@exzaestate.test`,
      fullName: 'MD Audit User A',
      password: 'Password123!Secure',
      isLocalMode: true,
    },
  });

  const compB = await provisioningService.provisionCompany({
    name: 'Audit Test Company B',
    code: `AUD${Date.now().toString().slice(-4)}B`,
    branchName: 'Head Office B',
    branchCode: 'HO-B',
    managingDirector: {
      email: `mdb_audit_${Date.now()}@exzaestate.test`,
      fullName: 'MD Audit User B',
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

  // User with Executive role (no audit:view)
  const execSession = await tenantDb.withCompany(compA.companyId, async (tx) => {
    const execRole = await tx.role.findFirstOrThrow({
      where: { companyId: compA.companyId, name: 'Executive' },
    });
    const execUser = await tx.user.create({
      data: {
        companyId: compA.companyId,
        email: `exec-audit-${Date.now()}@example.com`,
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

  // User with audit:view but WITHOUT 2FA
  const no2faSession = await tenantDb.withCompany(compA.companyId, async (tx) => {
    const mdRole = await tx.role.findFirstOrThrow({
      where: { companyId: compA.companyId, name: 'Managing Director' },
    });
    const no2faUser = await tx.user.create({
      data: {
        companyId: compA.companyId,
        email: `no2fa-audit-${Date.now()}@example.com`,
        passwordHash: 'dummy-hash',
        fullName: 'No 2FA Admin',
        phone: `+8801700${Math.floor(100000 + Math.random() * 900000)}`,
        status: 'ACTIVE',
        isTwoFactorEnabled: false,
      },
    });
    await tx.userRole.create({
      data: {
        companyId: compA.companyId,
        userId: no2faUser.id,
        roleId: mdRole.id,
      },
    });
    return tx.session.create({
      data: {
        companyId: compA.companyId,
        userId: no2faUser.id,
        familyId: crypto.randomUUID(),
      },
    });
  });

  const no2faToken = tokenService.generateAccessToken({
    sub: no2faSession.userId,
    companyId: compA.companyId,
    sid: no2faSession.id,
  });

  return {
    app,
    tenantDb,
    auditService,
    securityEventsService,
    companyAId: compA.companyId,
    companyBId: compB.companyId,
    mdAToken,
    mdBToken,
    executiveToken,
    no2faToken,
    mdAUserId: compA.managingDirectorUserId,
  };
}
