import { HttpStatus } from '@nestjs/common';
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
import { LandModule } from '../../src/modules/land/land.module.js';
import { PlatformModule } from '../../src/platform/platform.module.js';
import { TenantProvisioningModule } from '../../src/platform/tenant-provisioning/tenant-provisioning.module.js';
import { TenantProvisioningService } from '../../src/platform/tenant-provisioning/tenant-provisioning.service.js';

describe('Land Unit Factors & Bangladeshi Area Conversion (Task A1.3 - S3 / AT-27)', () => {
  let app: INestApplication;
  let tenantDb: TenantDb;
  let tokenService: TokenService;
  let provisioningService: TenantProvisioningService;

  let companyAId: string;
  let companyBId: string;
  let mdAToken: string;
  let mdBToken: string;

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
        ClsModule.forRoot({ global: true, middleware: { mount: true } }),
        DatabaseModule,
        PlatformModule,
        AdaptersModule,
        AuthModule,
        LandModule,
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

    // 1. Provision Company A
    const provA = await provisioningService.provisionCompany({
      name: 'Factor Test Estate A',
      code: `FAC${Date.now().toString().slice(-4)}A`,
      branchName: 'Head Office A',
      branchCode: 'HO-A',
      managingDirector: {
        email: `mda_fac_${Date.now()}@exzaestate.test`,
        fullName: 'MD Company A',
        password: 'Password123!Secure',
        isLocalMode: true,
      },
    });
    companyAId = provA.companyId;

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
    mdAToken = tokenService.generateAccessToken({
      sub: provA.managingDirectorUserId,
      companyId: companyAId,
      sid: sessionA.id,
    });

    // 2. Provision Company B
    const provB = await provisioningService.provisionCompany({
      name: 'Factor Test Estate B',
      code: `FAC${Date.now().toString().slice(-4)}B`,
      branchName: 'Head Office B',
      branchCode: 'HO-B',
      managingDirector: {
        email: `mdb_fac_${Date.now()}@exzaestate.test`,
        fullName: 'MD Company B',
        password: 'Password123!Secure',
        isLocalMode: true,
      },
    });
    companyBId = provB.companyId;

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
    mdBToken = tokenService.generateAccessToken({
      sub: provB.managingDirectorUserId,
      companyId: companyBId,
      sid: sessionB.id,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/lands/factors - retrieves provisioned default Bangladeshi factors', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/lands/factors')
      .set('Authorization', `Bearer ${mdAToken}`)
      .expect(HttpStatus.OK);

    expect(res.body.success).toBe(true);
    expect(Number(res.body.data.katha)).toBe(720);
    expect(Number(res.body.data.decimal)).toBe(435.6);
    expect(Number(res.body.data.bigha)).toBe(14400);
    expect(Number(res.body.data.acre)).toBe(43560);
  });

  it('AT-27: 5 Katha + 3 Decimal converts to exact 4,906.8 sq ft using default factors', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/lands')
      .set('Authorization', `Bearer ${mdAToken}`)
      .send({
        name: 'Keraniganj Riverside Parcel',
        code: 'LND-AT27-01',
        district: 'Dhaka',
        upazila: 'Keraniganj',
        mouza: 'Hasnabad',
        compoundArea: [
          { value: 5, unit: 'KATHA' }, // 5 * 720 = 3600 sq ft
          { value: 3, unit: 'DECIMAL' }, // 3 * 435.6 = 1306.8 sq ft
        ],
      })
      .expect(HttpStatus.CREATED);

    expect(res.body.success).toBe(true);
    // 3,600 + 1,306.8 = 4,906.8 sq ft
    expect(res.body.data.areaSqft).toBe('4906.8000');
    expect(res.body.data.conversions.sqft).toBe('4906.8000');
    expect(res.body.data.conversions.katha).toBe('6.8150');
    expect(res.body.data.conversions.decimal).toBe('11.2645');
  });

  it('PUT /api/v1/lands/factors - allows per-company factor override', async () => {
    // Override Katha in Company A to 750 sq ft (regional variation)
    const updateRes = await request(app.getHttpServer())
      .put('/api/v1/lands/factors')
      .set('Authorization', `Bearer ${mdAToken}`)
      .send({
        katha: 750,
      })
      .expect(HttpStatus.OK);

    expect(updateRes.body.success).toBe(true);
    expect(Number(updateRes.body.data.katha)).toBe(750);

    // Verify GET reflects the override
    const getRes = await request(app.getHttpServer())
      .get('/api/v1/lands/factors')
      .set('Authorization', `Bearer ${mdAToken}`)
      .expect(HttpStatus.OK);

    expect(Number(getRes.body.data.katha)).toBe(750);
  });

  it('Land created under Company A uses the overridden factor (10 Katha = 7,500 sq ft)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/lands')
      .set('Authorization', `Bearer ${mdAToken}`)
      .send({
        name: 'Sylhet Regional Parcel',
        code: 'LND-SYL-01',
        district: 'Sylhet',
        upazila: 'Golapganj',
        mouza: 'Dhaka Dakshin',
        enteredArea: 10,
        enteredUnit: 'KATHA',
      })
      .expect(HttpStatus.CREATED);

    expect(res.body.success).toBe(true);
    // 10 * 750 = 7500.0000 sq ft
    expect(res.body.data.areaSqft).toBe('7500.0000');
    expect(res.body.data.conversions.katha).toBe('10.0000');
  });

  it('Company B retains default factor (cross-tenant factor isolation: 10 Katha = 7,200 sq ft)', async () => {
    // Company B GET factors still shows default 720
    const factorRes = await request(app.getHttpServer())
      .get('/api/v1/lands/factors')
      .set('Authorization', `Bearer ${mdBToken}`)
      .expect(HttpStatus.OK);

    expect(Number(factorRes.body.data.katha)).toBe(720);

    // Land created in Company B uses 720
    const res = await request(app.getHttpServer())
      .post('/api/v1/lands')
      .set('Authorization', `Bearer ${mdBToken}`)
      .send({
        name: 'Company B Standard Parcel',
        code: 'LND-COB-01',
        district: 'Gazipur',
        upazila: 'Tongi',
        mouza: 'Tongi',
        enteredArea: 10,
        enteredUnit: 'KATHA',
      })
      .expect(HttpStatus.CREATED);

    expect(res.body.success).toBe(true);
    // 10 * 720 = 7200.0000 sq ft
    expect(res.body.data.areaSqft).toBe('7200.0000');
    expect(res.body.data.conversions.katha).toBe('10.0000');
  });
});
