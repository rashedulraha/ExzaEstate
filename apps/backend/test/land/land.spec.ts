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

describe('Land Master & CRUD (Task A1.3 - S2)', () => {
  let app: INestApplication;
  let tenantDb: TenantDb;
  let tokenService: TokenService;
  let provisioningService: TenantProvisioningService;

  let companyAId: string;
  let companyBId: string;
  let mdAToken: string;
  let mdBToken: string;
  let regularUserToken: string;

  let createdLandId: string;

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

    // Provision Company A
    const provA = await provisioningService.provisionCompany({
      name: 'Land Test Estate A',
      code: `LND${Date.now().toString().slice(-4)}A`,
      branchName: 'Head Office A',
      branchCode: 'HO-A',
      managingDirector: {
        email: `mda_${Date.now()}@exzaestate.test`,
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

    // Provision Company B (for isolation test)
    const provB = await provisioningService.provisionCompany({
      name: 'Land Test Estate B',
      code: `LND${Date.now().toString().slice(-4)}B`,
      branchName: 'Head Office B',
      branchCode: 'HO-B',
      managingDirector: {
        email: `mdb_${Date.now()}@exzaestate.test`,
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

    // Create a user in Company A with NO land permissions
    const regularUser = await tenantDb.withCompany(companyAId, async (tx) => {
      return tx.user.create({
        data: {
          companyId: companyAId,
          email: `viewer_${Date.now()}@exzaestate.test`,
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
    regularUserToken = tokenService.generateAccessToken({
      sub: regularUser.id,
      companyId: companyAId,
      sid: regularSession.id,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/v1/lands - creates land with compound area (AT-27: 5 Katha + 3 Decimal = 4906.8 sq ft)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/lands')
      .set('Authorization', `Bearer ${mdAToken}`)
      .send({
        name: 'Purbachal Green Oasis',
        code: 'LND-PUR-001',
        district: 'Dhaka',
        upazila: 'Rupganj',
        mouza: 'Baraid',
        jlNumber: 'JL-45',
        khatianNumber: 'RS-992',
        dagNumber: 'CS-101, RS-202',
        deedNumber: 'DEED-1234/2025',
        deedDate: '2025-01-15',
        recordedOwners: 'Md. Karim & Brothers',
        compoundArea: [
          { value: 5, unit: 'KATHA' },
          { value: 3, unit: 'DECIMAL' },
        ],
        purchasePricePaisa: '15000000000', // 1.5 crore BDT
        ownershipStatus: 'OWNED',
      })
      .expect(HttpStatus.CREATED);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.code).toBe('LND-PUR-001');
    expect(res.body.data.areaSqft).toBe('4906.8000');
    expect(res.body.data.conversions.katha).toBe('6.8150');
    expect(res.body.data.conversions.decimal).toBe('11.2645');
    createdLandId = res.body.data.id;
  });

  it('POST /api/v1/lands - denies access without land:create permission', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/lands')
      .set('Authorization', `Bearer ${regularUserToken}`)
      .send({
        name: 'Unauthorized Land',
        district: 'Gazipur',
        upazila: 'Sreepur',
        mouza: 'Mowna',
        areaSqft: 7200,
      })
      .expect(HttpStatus.FORBIDDEN);

    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('POST /api/v1/lands - rejects duplicate code within same company', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/lands')
      .set('Authorization', `Bearer ${mdAToken}`)
      .send({
        name: 'Duplicate Code Land',
        code: 'LND-PUR-001',
        district: 'Dhaka',
        upazila: 'Rupganj',
        mouza: 'Baraid',
        areaSqft: 5000,
      })
      .expect(HttpStatus.CONFLICT);

    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('GET /api/v1/lands - lists lands with filters and pagination', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/lands?district=Dhaka')
      .set('Authorization', `Bearer ${mdAToken}`)
      .expect(HttpStatus.OK);

    expect(res.body.success).toBe(true);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.items[0].id).toBe(createdLandId);
  });

  it('GET /api/v1/lands/:id - retrieves land details and computed unit conversions', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/lands/${createdLandId}`)
      .set('Authorization', `Bearer ${mdAToken}`)
      .expect(HttpStatus.OK);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(createdLandId);
    expect(res.body.data.conversions).toBeDefined();
    expect(res.body.data.conversions.sqft).toBe('4906.8000');
  });

  it('PATCH /api/v1/lands/:id - updates land details and recalculates canonical sq ft', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/lands/${createdLandId}`)
      .set('Authorization', `Bearer ${mdAToken}`)
      .send({
        name: 'Purbachal Green Oasis Phase 1',
        enteredArea: 10,
        enteredUnit: 'KATHA',
      })
      .expect(HttpStatus.OK);

    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Purbachal Green Oasis Phase 1');
    expect(res.body.data.areaSqft).toBe('7200.0000'); // 10 * 720
  });

  it('GET /api/v1/lands/:id - cross-tenant isolation: Company B cannot read Company A land', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/lands/${createdLandId}`)
      .set('Authorization', `Bearer ${mdBToken}`)
      .expect(HttpStatus.NOT_FOUND);

    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('DELETE /api/v1/lands/:id - soft-deletes land parcel', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/lands/${createdLandId}`)
      .set('Authorization', `Bearer ${mdAToken}`)
      .expect(HttpStatus.OK);

    // Subsequent retrieval returns 404
    await request(app.getHttpServer())
      .get(`/api/v1/lands/${createdLandId}`)
      .set('Authorization', `Bearer ${mdAToken}`)
      .expect(HttpStatus.NOT_FOUND);
  });
});
