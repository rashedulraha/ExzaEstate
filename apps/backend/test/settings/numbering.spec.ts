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
import { NumberingService } from '../../src/modules/settings/numbering.service.js';
import { SettingsModule } from '../../src/modules/settings/settings.module.js';
import { PlatformModule } from '../../src/platform/platform.module.js';
import { TenantProvisioningService } from '../../src/platform/tenant-provisioning/tenant-provisioning.service.js';
import { TenantProvisioningModule } from '../../src/platform/tenant-provisioning/tenant-provisioning.module.js';

describe('S3: Numbering Controls & Gapless Sequences (Tier 2)', () => {
  let app: INestApplication;
  let tenantDb: TenantDb;
  let tokenService: TokenService;
  let provisioningService: TenantProvisioningService;
  let numberingService: NumberingService;

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
        SettingsModule,
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
    numberingService = moduleRef.get(NumberingService);

    // 1. Provision test company
    const provisionRes = await provisioningService.provisionCompany({
      name: 'Exza Living Numbering Corp',
      code: `EXZANUM${Date.now().toString().slice(-4)}`,
      branchName: 'Head Office Dhaka',
      branchCode: 'DHK',
      managingDirector: {
        email: `md-num-${Date.now()}@exzaliving.com`,
        fullName: 'Numbering Director',
        password: 'Password123!Secure',
        isLocalMode: true,
      },
    });

    companyId = provisionRes.companyId;
    mdUserId = provisionRes.managingDirectorUserId;

    // 2. Active MD session with 2FA
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

  // ---------------------------------------------------------------------------
  // Acceptance Criterion Test
  // ---------------------------------------------------------------------------

  it('renders "RCPT-DHK-2026-000001" from pattern "RCPT-{BRANCH}-{YEAR}-{SEQ:6}" (Acceptance Check)', async () => {
    const res = await request(app.getHttpServer())
      .get(
        '/api/v1/numbering/preview?documentType=RECEIPT&pattern=RCPT-{BRANCH}-{YEAR}-{SEQ:6}&branchCode=DHK&year=2026',
      )
      .set('Authorization', `Bearer ${mdToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.formatted).toBe('RCPT-DHK-2026-000001');
  });

  // ---------------------------------------------------------------------------
  // Gapless Sequence Generation via SequenceService
  // ---------------------------------------------------------------------------

  it('generates sequential numbers atomically without gaps', async () => {
    const num1 = await tenantDb.withCompany(companyId, async (tx) => {
      return numberingService.generateNext(tx, {
        documentType: 'RECEIPT',
        branchCode: 'DHK',
        date: new Date('2026-05-10T12:00:00Z'),
      });
    });

    expect(num1).toBe('RCPT-DHK-2026-000001');

    const num2 = await tenantDb.withCompany(companyId, async (tx) => {
      return numberingService.generateNext(tx, {
        documentType: 'RECEIPT',
        branchCode: 'DHK',
        date: new Date('2026-05-10T12:00:00Z'),
      });
    });

    expect(num2).toBe('RCPT-DHK-2026-000002');
  });

  it('preserves gapless sequence when transaction rolls back', async () => {
    // Generate next inside transaction that deliberately rolls back
    try {
      await tenantDb.withCompany(companyId, async (tx) => {
        await numberingService.generateNext(tx, {
          documentType: 'RECEIPT',
          branchCode: 'DHK',
          date: new Date('2026-05-10T12:00:00Z'),
        });
        throw new Error('Simulated rollback in business operation');
      });
    } catch {
      // Expected rollback
    }

    // Now the next successful generation must NOT skip a number
    const num3 = await tenantDb.withCompany(companyId, async (tx) => {
      return numberingService.generateNext(tx, {
        documentType: 'RECEIPT',
        branchCode: 'DHK',
        date: new Date('2026-05-10T12:00:00Z'),
      });
    });

    expect(num3).toBe('RCPT-DHK-2026-000003');
  });

  // ---------------------------------------------------------------------------
  // Trap Prevention: Editing Issued Patterns Without New Series
  // ---------------------------------------------------------------------------

  it('blocks altering pattern on an active series that already issued numbers without confirmation', async () => {
    // Attempting to change pattern on RECEIPT which already issued numbers 1, 2, 3
    const res = await request(app.getHttpServer())
      .put('/api/v1/numbering/patterns/RECEIPT')
      .set('Authorization', `Bearer ${mdToken}`)
      .send({
        pattern: 'RCPT-V2-{YEAR}-{SEQ:6}',
        prefix: 'RCPT-V2',
      })
      .expect(409);

    expect(res.body.error.code).toBe('CONFLICT');
    expect(res.body.error.message).toContain('confirmSeriesChange');
  });

  it('allows altering pattern when confirmSeriesChange is explicitly true and writes audit log', async () => {
    const res = await request(app.getHttpServer())
      .put('/api/v1/numbering/patterns/RECEIPT')
      .set('Authorization', `Bearer ${mdToken}`)
      .send({
        pattern: 'RCPT-V2-{BRANCH}-{YEAR}-{SEQ:6}',
        prefix: 'RCPT-V2',
        confirmSeriesChange: true,
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.pattern).toBe('RCPT-V2-{BRANCH}-{YEAR}-{SEQ:6}');

    // Verify audit log
    await tenantDb.withCompany(companyId, async (tx) => {
      const logs = await tx.$queryRawUnsafe<
        Array<{ action: string; new_value: Record<string, unknown> | string }>
      >(
        `SELECT action, new_value FROM audit_logs WHERE company_id = $1::uuid AND action = 'NUMBERING_PATTERN_UPDATED' ORDER BY created_at DESC LIMIT 1`,
        companyId,
      );
      expect(logs.length).toBe(1);
      const raw = logs[0]!.new_value;
      const parsed = typeof raw === 'string' ? (JSON.parse(raw) as Record<string, unknown>) : raw;
      expect(parsed.prefix).toBe('RCPT-V2');
    });
  });
});
