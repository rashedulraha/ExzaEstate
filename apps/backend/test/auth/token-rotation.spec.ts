import { Test, TestingModule } from '@nestjs/testing';
import jwt from 'jsonwebtoken';
import { ClsModule, ClsService } from 'nestjs-cls';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { RequestContext } from '../../src/common/context/request-context.service.js';
import { ConfigModule } from '../../src/config/config.module.js';
import { validateEnv } from '../../src/config/env.schema.js';
import { DatabaseModule } from '../../src/database/database.module.js';
import { PrismaService } from '../../src/database/prisma.service.js';
import { TenantDb } from '../../src/database/tenant-db.service.js';
import { TokenService } from '../../src/modules/auth/token.service.js';
import { AuditService } from '../../src/platform/audit/audit.service.js';
import { PlatformModule } from '../../src/platform/platform.module.js';

describe('S2: Token Engine & Refresh Token Family Rotation', () => {
  let moduleRef: TestingModule;
  let clsService: ClsService;
  let tenantDb: TenantDb;
  let prismaService: PrismaService;
  let tokenService: TokenService;

  const testCompanyId = crypto.randomUUID();
  const testUserId = crypto.randomUUID();

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
    });

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot(config),
        ClsModule.forRoot({
          global: true,
          middleware: { mount: false },
        }),
        DatabaseModule,
        PlatformModule,
      ],
      providers: [RequestContext, TenantDb, TokenService, AuditService],
    }).compile();

    clsService = moduleRef.get<ClsService>(ClsService);
    tenantDb = moduleRef.get<TenantDb>(TenantDb);
    prismaService = moduleRef.get<PrismaService>(PrismaService);
    tokenService = moduleRef.get<TokenService>(TokenService);

    await prismaService.onModuleInit();

    // Seed test company and user in DB
    await clsService.run(async () => {
      clsService.set('companyId', testCompanyId);
      await tenantDb.transaction(async (tx) => {
        await tx.$executeRawUnsafe(
          `INSERT INTO companies (id, company_id, name, code)
           VALUES ('${testCompanyId}', '${testCompanyId}', 'Token Test Corp', 'TTC-${Date.now()}')`,
        );

        await tx.$executeRawUnsafe(
          `INSERT INTO users (id, company_id, email, password_hash, full_name)
           VALUES ('${testUserId}', '${testCompanyId}', 'token-user-${Date.now()}@test.com', 'dummy_hash', 'Token User')`,
        );
      });
    });
  });

  afterAll(async () => {
    if (prismaService) {
      await clsService.run(async () => {
        clsService.set('companyId', testCompanyId);
        await tenantDb.transaction(async (tx) => {
          await tx.$executeRawUnsafe(
            `DELETE FROM refresh_tokens WHERE company_id = '${testCompanyId}'`,
          );
          await tx.$executeRawUnsafe(`DELETE FROM sessions WHERE company_id = '${testCompanyId}'`);
          await tx.$executeRawUnsafe(`DELETE FROM users WHERE company_id = '${testCompanyId}'`);
          await tx.$executeRawUnsafe(`DELETE FROM companies WHERE company_id = '${testCompanyId}'`);
        });
      });
      await prismaService.onModuleDestroy();
    }
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  it('generates access token with ONLY sub, companyId, and sid in payload', async () => {
    let tokens: { accessToken: string; refreshToken: string } | undefined;

    await clsService.run(async () => {
      clsService.set('companyId', testCompanyId);
      await tenantDb.transaction(async (tx) => {
        tokens = await tokenService.createSessionAndTokens(tx, {
          userId: testUserId,
          companyId: testCompanyId,
          userAgent: 'TestBrowser/1.0',
          ipAddress: '127.0.0.1',
        });
      });
    });

    expect(tokens).toBeDefined();
    const decoded = jwt.decode(tokens!.accessToken) as Record<string, unknown>;

    expect(decoded.sub).toBe(testUserId);
    expect(decoded.companyId).toBe(testCompanyId);
    expect(decoded.sid).toBeDefined();

    // Strict Architectural Invariant: Never put roles, permissions, or branchIds in the JWT
    expect(decoded.roles).toBeUndefined();
    expect(decoded.permissions).toBeUndefined();
    expect(decoded.branchIds).toBeUndefined();

    // Verify refresh token is NOT stored as plaintext in DB
    await clsService.run(async () => {
      clsService.set('companyId', testCompanyId);
      await tenantDb.transaction(async (tx) => {
        const rows = await tx.$queryRawUnsafe<Array<{ token_hash: string }>>(
          `SELECT token_hash FROM refresh_tokens WHERE company_id = '${testCompanyId}'`,
        );
        expect(rows.length).toBeGreaterThanOrEqual(1);
        expect(rows[0]?.token_hash).not.toBe(tokens!.refreshToken);
      });
    });
  });

  it('rotates refresh token cleanly inside the same family', async () => {
    let initialTokens: { accessToken: string; refreshToken: string } | undefined;

    await clsService.run(async () => {
      clsService.set('companyId', testCompanyId);
      await tenantDb.transaction(async (tx) => {
        initialTokens = await tokenService.createSessionAndTokens(tx, {
          userId: testUserId,
          companyId: testCompanyId,
          userAgent: 'TestBrowser/1.0',
          ipAddress: '127.0.0.1',
        });
      });
    });

    let rotatedTokens: { accessToken: string; refreshToken: string } | undefined;

    await clsService.run(async () => {
      clsService.set('companyId', testCompanyId);
      await tenantDb.transaction(async (tx) => {
        rotatedTokens = await tokenService.rotateRefreshToken(tx, initialTokens!.refreshToken, {
          userAgent: 'TestBrowser/2.0',
          ipAddress: '127.0.0.1',
        });
      });
    });

    expect(rotatedTokens).toBeDefined();
    expect(rotatedTokens!.refreshToken).not.toBe(initialTokens!.refreshToken);

    // Verify old refresh token is marked revoked and replaced
    await clsService.run(async () => {
      clsService.set('companyId', testCompanyId);
      await tenantDb.transaction(async (tx) => {
        const initialHash = tokenService.hashToken(initialTokens!.refreshToken);
        const rows = await tx.$queryRawUnsafe<
          Array<{ revoked_at: Date | null; replaced_by_id: string | null }>
        >(
          `SELECT revoked_at, replaced_by_id FROM refresh_tokens WHERE token_hash = '${initialHash}'`,
        );

        expect(rows[0]?.revoked_at).not.toBeNull();
        expect(rows[0]?.replaced_by_id).not.toBeNull();
      });
    });
  });

  it('detects refresh token reuse, revokes whole family and audits REFRESH_TOKEN_REUSE', async () => {
    let t1: { accessToken: string; refreshToken: string } | undefined;

    await clsService.run(async () => {
      clsService.set('companyId', testCompanyId);
      await tenantDb.transaction(async (tx) => {
        t1 = await tokenService.createSessionAndTokens(tx, {
          userId: testUserId,
          companyId: testCompanyId,
          userAgent: 'LegitClient/1.0',
          ipAddress: '127.0.0.1',
        });
      });
    });

    // Legitimate rotation: t1 -> t2
    let t2: { accessToken: string; refreshToken: string } | undefined;
    await clsService.run(async () => {
      clsService.set('companyId', testCompanyId);
      await tenantDb.transaction(async (tx) => {
        t2 = await tokenService.rotateRefreshToken(tx, t1!.refreshToken, {
          userAgent: 'LegitClient/2.0',
          ipAddress: '127.0.0.1',
        });
      });
    });

    // Attacker tries to use already-rotated t1!
    await clsService.run(async () => {
      clsService.set('companyId', testCompanyId);
      await expect(
        tenantDb.transaction(async (tx) => {
          await tokenService.rotateRefreshToken(tx, t1!.refreshToken, {
            userAgent: 'AttackerClient/1.0',
            ipAddress: '192.168.1.100',
          });
        }),
      ).rejects.toThrow(/REFRESH_TOKEN_REUSE|revoked/i);
    });

    // Verify entire family (including t2 and session) is now revoked
    await clsService.run(async () => {
      clsService.set('companyId', testCompanyId);
      await tenantDb.transaction(async (tx) => {
        const t2Hash = tokenService.hashToken(t2!.refreshToken);
        const rows = await tx.$queryRawUnsafe<Array<{ revoked_at: Date | null }>>(
          `SELECT revoked_at FROM refresh_tokens WHERE token_hash = '${t2Hash}'`,
        );
        expect(rows[0]?.revoked_at).not.toBeNull();
      });
    });

    // Verify REFRESH_TOKEN_REUSE is recorded in audit_logs
    await clsService.run(async () => {
      clsService.set('companyId', testCompanyId);
      await tenantDb.transaction(async (tx) => {
        const auditRows = await tx.$queryRawUnsafe<Array<{ action: string }>>(
          `SELECT action FROM audit_logs WHERE company_id = '${testCompanyId}' AND action = 'REFRESH_TOKEN_REUSE'`,
        );
        expect(auditRows.length).toBeGreaterThanOrEqual(1);
      });
    });
  });
});
