import type { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ClsModule } from 'nestjs-cls';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AdaptersModule } from '../../src/adapters/adapters.module.js';
import { configureApp } from '../../src/bootstrap.js';
import { ConfigModule } from '../../src/config/config.module.js';
import { ConfigService } from '../../src/config/config.service.js';
import { validateEnv } from '../../src/config/env.schema.js';
import { DatabaseModule } from '../../src/database/database.module.js';
import { TenantDb } from '../../src/database/tenant-db.service.js';
import { AuthModule } from '../../src/modules/auth/auth.module.js';
import { TokenService } from '../../src/modules/auth/token.service.js';
import { CompanyModule } from '../../src/modules/company/company.module.js';
import { PlatformModule } from '../../src/platform/platform.module.js';
import { TenantProvisioningService } from '../../src/platform/tenant-provisioning/tenant-provisioning.service.js';
import { TenantProvisioningModule } from '../../src/platform/tenant-provisioning/tenant-provisioning.module.js';

describe('Company Profile CRUD & Audit Logging', () => {
  let app: INestApplication;
  let tenantDb: TenantDb;
  let tokenService: TokenService;
  let provisioningService: TenantProvisioningService;

  let companyId: string;
  let mdUserId: string;
  let mdToken: string;

  beforeAll(async () => {
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
        ClsModule.forRoot({
          global: true,
          middleware: { mount: true },
        }),
        DatabaseModule,
        AdaptersModule.forRoot('cloud'),
        PlatformModule,
        AuthModule,
        CompanyModule,
        TenantProvisioningModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    const configService = moduleRef.get(ConfigService);
    configureApp(app, configService);
    await app.init();

    tenantDb = moduleRef.get(TenantDb);
    tokenService = moduleRef.get(TokenService);
    provisioningService = moduleRef.get(TenantProvisioningService);

    // 1. Provision a test company
    const provisionRes = await provisioningService.provisionCompany({
      name: 'Exza Living Real Estate Ltd',
      code: `EXZACMP${Date.now().toString().slice(-4)}`,
      branchName: 'Head Office Gulshan',
      branchCode: 'DHK-HO',
      managingDirector: {
        email: `md-${Date.now()}@exzaliving.com`,
        fullName: 'Rashedul MD',
        password: 'Password123!Secure',
        isLocalMode: true,
      },
    });

    companyId = provisionRes.companyId;
    mdUserId = provisionRes.managingDirectorUserId;

    // Ensure MD user is ACTIVE and 2FA enabled, then issue MD token
    const mdSession = await tenantDb.withCompany(companyId, async (tx) => {
      await tx.user.update({
        where: { id: mdUserId },
        data: {
          status: 'ACTIVE',
          isTwoFactorEnabled: true,
        },
      });

      return tx.session.create({
        data: {
          companyId,
          userId: mdUserId,
          familyId: crypto.randomUUID(),
        },
      });
    });

    mdToken = tokenService.generateAccessToken({
      sub: mdUserId,
      companyId,
      sid: mdSession.id,
    });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('reads company profile with branding and fiscal metadata', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/company/profile')
      .set('Authorization', `Bearer ${mdToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Exza Living Real Estate Ltd');
    expect(res.body.data.timezone).toBe('Asia/Dhaka');
  });

  it('updates company profile and writes an audit log with before/after', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/v1/company/profile')
      .set('Authorization', `Bearer ${mdToken}`)
      .send({
        address: 'Plot 42, Road 11, Banani, Dhaka-1213',
        contactPhone: '+8801711000000',
        contactEmail: 'info@exzaliving.com',
        taxNumber: 'TIN-987654321',
        binNumber: 'BIN-123456789',
        receiptFooter: 'Thank you for choosing Exza Living.',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.address).toBe('Plot 42, Road 11, Banani, Dhaka-1213');
    expect(res.body.data.taxNumber).toBe('TIN-987654321');

    await tenantDb.withCompany(companyId, async (tx) => {
      const logs = await tx.$queryRawUnsafe<
        Array<{ action: string; new_value: string | Record<string, unknown> }>
      >(
        `SELECT action, new_value FROM audit_logs WHERE company_id = $1::uuid AND action = 'COMPANY_UPDATED' ORDER BY created_at DESC LIMIT 1`,
        companyId,
      );
      expect(logs.length).toBe(1);
      expect(logs[0]?.action).toBe('COMPANY_UPDATED');
      const raw = logs[0]!.new_value;
      const parsed = typeof raw === 'string' ? (JSON.parse(raw) as Record<string, unknown>) : raw;
      expect(parsed.taxNumber).toBe('TIN-987654321');
    });
  });
});
