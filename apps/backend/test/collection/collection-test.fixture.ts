import crypto from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
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
import { CollectionModule } from '../../src/modules/collection/collection.module.js';
import { SalesModule } from '../../src/modules/sales/sales.module.js';
import { PlatformModule } from '../../src/platform/platform.module.js';
import { TenantProvisioningModule } from '../../src/platform/tenant-provisioning/tenant-provisioning.module.js';
import { TenantProvisioningService } from '../../src/platform/tenant-provisioning/tenant-provisioning.service.js';

export interface CollectionTestContext {
  app: INestApplication;
  tenantDb: TenantDb;
  companyAId: string;
  companyBId: string;
  mdUserId: string;
  mdToken: string;
  accountantUserId: string;
  accountantToken: string;
  execUserId: string;
  execToken: string;
  testCustomerId: string;
  testBookingId: string;
  testPropertyId: string;
  close: () => Promise<void>;
}

export async function setupCollectionTestContext(): Promise<CollectionTestContext> {
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

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot(config),
      ClsModule.forRoot({ global: true, middleware: { mount: true } }),
      DatabaseModule,
      PlatformModule,
      AdaptersModule.forRoot('cloud'),
      AuthModule,
      SalesModule,
      CollectionModule,
      TenantProvisioningModule,
    ],
  }).compile();

  const app = moduleFixture.createNestApplication();
  const configService = moduleFixture.get(ConfigService);
  configureApp(app, configService);
  await app.init();

  const provisioningService = app.get(TenantProvisioningService);
  const tenantDb = app.get(TenantDb);
  const tokenService = app.get(TokenService);

  const uniqueSuffixA = crypto.randomUUID().slice(0, 6).toUpperCase();
  const provA = await provisioningService.provisionCompany({
    name: `Collection Test Real Estate ${uniqueSuffixA}`,
    code: `COL${uniqueSuffixA}`,
    branchName: 'Main Branch',
    branchCode: 'MBR-01',
    managingDirector: {
      email: `md_col_${uniqueSuffixA.toLowerCase()}@exzaestate.test`,
      fullName: 'Collection MD User',
      password: 'Password123!Secure',
      isLocalMode: true,
    },
  });
  const companyAId = provA.companyId;
  const mdUserId = provA.managingDirectorUserId;

  const mdSession = await tenantDb.withCompany(companyAId, async (tx) => {
    await tx.user.update({
      where: { id: mdUserId },
      data: { isTwoFactorEnabled: true, twoFactorEnrolledAt: new Date() },
    });
    return tx.session.create({
      data: { companyId: companyAId, userId: mdUserId, familyId: crypto.randomUUID() },
    });
  });
  const mdToken = tokenService.generateAccessToken({
    sub: mdUserId,
    companyId: companyAId,
    sid: mdSession.id,
  });

  // Accountant User in Company A
  const accRole = await tenantDb.withCompany(companyAId, async (tx) => {
    return tx.role.findFirstOrThrow({
      where: { companyId: companyAId, code: 'ACCOUNTANT' },
    });
  });
  const accUser = await tenantDb.withCompany(companyAId, async (tx) => {
    return tx.user.create({
      data: {
        companyId: companyAId,
        email: `acc_${uniqueSuffixA.toLowerCase()}@exzaestate.test`,
        fullName: 'Collection Accountant User',
        passwordHash: 'dummy',
        status: 'ACTIVE',
        isTwoFactorEnabled: true,
        twoFactorEnrolledAt: new Date(),
        roles: { create: { companyId: companyAId, roleId: accRole.id } },
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

  // Executive User in Company A
  const execRole = await tenantDb.withCompany(companyAId, async (tx) => {
    return tx.role.findFirstOrThrow({
      where: { companyId: companyAId, code: 'EXECUTIVE' },
    });
  });
  const execUser = await tenantDb.withCompany(companyAId, async (tx) => {
    return tx.user.create({
      data: {
        companyId: companyAId,
        email: `exec_${uniqueSuffixA.toLowerCase()}@exzaestate.test`,
        fullName: 'Collection Executive User',
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

  // Seed project, property, customer, booking
  let testCustomerId = '';
  let testPropertyId = '';
  let testBookingId = '';
  await tenantDb.withCompany(companyAId, async (tx) => {
    const project = await tx.project.create({
      data: {
        companyId: companyAId,
        code: `PRJ-${uniqueSuffixA}`,
        name: 'Collection Test Project',
        type: 'RESIDENTIAL',
        status: 'UPCOMING',
      },
    });

    const property = await tx.property.create({
      data: {
        companyId: companyAId,
        projectId: project.id,
        code: `PLOT-${uniqueSuffixA}`,
        type: 'PLOT',
        status: 'Reserved',
        areaSqft: 2000,
        basePricePaisa: 10_000_000_0n,
        netPricePaisa: 10_000_000_0n,
      },
    });
    testPropertyId = property.id;

    const customer = await tx.customer.create({
      data: {
        companyId: companyAId,
        customerNumber: `CUST-${uniqueSuffixA}`,
        name: 'Shakil Ahmed',
        phone: '+8801700112233',
        customerType: 'INDIVIDUAL',
      },
    });
    testCustomerId = customer.id;

    const booking = await tx.booking.create({
      data: {
        companyId: companyAId,
        bookingNumber: `BKG-2026-${uniqueSuffixA}`,
        propertyId: property.id,
        customerId: customer.id,
        salesExecutiveId: execUserId,
        status: 'REQUESTED',
        basePricePaisa: 10_000_000_0n,
        totalPricePaisa: 10_000_000_0n,
        netPricePaisa: 10_000_000_0n,
        bookingAmountPaisa: 500_000_0n,
        customers: {
          create: [
            {
              companyId: companyAId,
              customerId: customer.id,
              sharePercentage: 100.0,
              isPrimary: true,
            },
          ],
        },
      },
    });
    testBookingId = booking.id;
  });

  return {
    app,
    tenantDb,
    companyAId,
    companyBId: companyAId,
    mdUserId,
    mdToken,
    accountantUserId,
    accountantToken,
    execUserId,
    execToken,
    testCustomerId,
    testBookingId,
    testPropertyId,
    close: async () => {
      await app.close();
    },
  };
}
